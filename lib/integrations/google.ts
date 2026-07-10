import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual, createHmac } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type GoogleSourceType = "google_sheets" | "gmail";

export type GoogleConnectionConfig = {
  source_type: GoogleSourceType;
  spreadsheet_id?: string;
  range?: string;
  import_kind?: "quotes" | "invoices";
  gmail_query?: string;
};

type StatePayload = {
  business_id: string;
  source_type: GoogleSourceType;
  config: GoogleConnectionConfig;
  iat: number;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

export function googleConnectReady(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI &&
      process.env.INTEGRATION_SECRET_KEY
  );
}

export function googleScopes(sourceType: GoogleSourceType): string[] {
  const base = ["https://www.googleapis.com/auth/userinfo.email"];
  if (sourceType === "google_sheets") return [...base, "https://www.googleapis.com/auth/spreadsheets.readonly"];
  return [...base, "https://www.googleapis.com/auth/gmail.readonly"];
}

export function buildGoogleAuthUrl(payload: Omit<StatePayload, "iat">): string {
  assertGoogleEnv();
  const state = signState({ ...payload, iat: Date.now() });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: googleScopes(payload.source_type).join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function parseGoogleState(state: string): StatePayload | null {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as StatePayload;
    if (Date.now() - payload.iat > 10 * 60_000) return null;
    if (!payload.business_id || !["google_sheets", "gmail"].includes(payload.source_type)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function exchangeGoogleCode(code: string): Promise<TokenResponse> {
  assertGoogleEnv();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });
  return (await response.json()) as TokenResponse;
}

export async function googleAccountEmail(accessToken: string): Promise<string | null> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { email?: string };
  return data.email ?? null;
}

export async function saveGoogleSecret(
  supabase: SupabaseClient,
  input: {
    connectionId: string;
    businessId: string;
    accessToken: string;
    refreshToken?: string | null;
    expiresIn?: number;
    scopes: string[];
    tokenType?: string;
  }
): Promise<void> {
  const expiresAt = input.expiresIn
    ? new Date(Date.now() + Math.max(60, input.expiresIn - 60) * 1000).toISOString()
    : null;
  await supabase.from("source_connection_secrets").upsert({
    source_connection_id: input.connectionId,
    business_id: input.businessId,
    provider: "google",
    access_token_ciphertext: encryptSecret(input.accessToken),
    refresh_token_ciphertext: input.refreshToken ? encryptSecret(input.refreshToken) : undefined,
    expires_at: expiresAt,
    scopes: input.scopes,
    token_type: input.tokenType ?? "Bearer",
    updated_at: new Date().toISOString(),
  });
}

export async function validGoogleAccessToken(
  supabase: SupabaseClient,
  connectionId: string
): Promise<string | null> {
  const { data: secret, error } = await supabase
    .from("source_connection_secrets")
    .select("access_token_ciphertext, refresh_token_ciphertext, expires_at, scopes, token_type")
    .eq("source_connection_id", connectionId)
    .maybeSingle();
  if (error || !secret?.access_token_ciphertext) return null;

  const expiresAt = secret.expires_at ? new Date(secret.expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) return decryptSecret(secret.access_token_ciphertext);

  if (!secret.refresh_token_ciphertext) return decryptSecret(secret.access_token_ciphertext);
  const refreshToken = decryptSecret(secret.refresh_token_ciphertext);
  const refreshed = await refreshGoogleToken(refreshToken);
  if (!refreshed.access_token) return null;

  await supabase
    .from("source_connection_secrets")
    .update({
      access_token_ciphertext: encryptSecret(refreshed.access_token),
      expires_at: refreshed.expires_in
        ? new Date(Date.now() + Math.max(60, refreshed.expires_in - 60) * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("source_connection_id", connectionId);

  return refreshed.access_token;
}

async function refreshGoogleToken(refreshToken: string): Promise<TokenResponse> {
  assertGoogleEnv();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return (await response.json()) as TokenResponse;
}

function assertGoogleEnv(): void {
  if (!googleConnectReady()) {
    throw new Error("Google integration env missing: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, INTEGRATION_SECRET_KEY");
  }
}

function signState(payload: StatePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function sign(value: string): string {
  return createHmac("sha256", integrationKey()).update(value).digest("base64url");
}

function integrationKey(): Buffer {
  const raw = process.env.INTEGRATION_SECRET_KEY || process.env.CRON_SECRET;
  if (!raw) throw new Error("INTEGRATION_SECRET_KEY is required for Google integrations.");
  return createHash("sha256").update(raw).digest();
}

function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", integrationKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

function decryptSecret(value: string): string {
  const [version, ivRaw, tagRaw, encryptedRaw] = value.split(":");
  if (version !== "v1" || !ivRaw || !tagRaw || !encryptedRaw) throw new Error("Invalid encrypted secret.");
  const decipher = createDecipheriv("aes-256-gcm", integrationKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
