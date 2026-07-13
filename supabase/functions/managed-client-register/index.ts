import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.1";

const MAX_BODY_BYTES = 6_000;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,128}$/;

function keyFromJson(name: "SUPABASE_SECRET_KEYS" | "SUPABASE_PUBLISHABLE_KEYS"): string {
  try {
    const keys = JSON.parse(Deno.env.get(name) || "{}") as Record<string, string>;
    return keys.default || Object.values(keys)[0] || "";
  } catch {
    return "";
  }
}

function response(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function publicError(message: string): { code: string; status: number } {
  const normalized = message.toLowerCase();
  if (normalized.includes("invitation_email_mismatch")) return { code: "invitation_email_mismatch", status: 403 };
  if (normalized.includes("invitation_expired")) return { code: "invitation_expired", status: 410 };
  if (normalized.includes("registration_attempt_limit_reached")) return { code: "registration_attempt_limit_reached", status: 429 };
  if (normalized.includes("invitation_not_pending")) return { code: "invitation_not_pending", status: 409 };
  if (normalized.includes("invitation_not_found")) return { code: "invitation_not_found", status: 404 };
  return { code: "registration_unavailable", status: 400 };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return response({ ok: false, error: "method_not_allowed" }, 405);

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return response({ ok: false, error: "request_too_large" }, 413);

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return response({ ok: false, error: "invalid_json" }, 400);
  }

  const token = clean(payload.token, 512);
  const email = clean(payload.email, 320).toLowerCase();
  const password = String(payload.password ?? "");
  if (token.length < 32 || !email || !PASSWORD_PATTERN.test(password)) {
    return response({ ok: false, error: "invalid_registration_details" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const secretKey = keyFromJson("SUPABASE_SECRET_KEYS") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const publishableKey = keyFromJson("SUPABASE_PUBLISHABLE_KEYS") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !secretKey || !publishableKey) {
    return response({ ok: false, error: "registration_configuration_missing" }, 503);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const publicClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: reservation, error: reservationError } = await admin.rpc(
    "reserve_managed_client_registration",
    { p_token: token, p_email: email }
  );
  if (reservationError || !reservation) {
    const failure = publicError(reservationError?.message || "invitation_not_found");
    return response({ ok: false, error: failure.code }, failure.status);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      managed_client: true,
      managed_invitation_id: String((reservation as { invitation_id?: string }).invitation_id || ""),
    },
  });

  if (createError || !created.user) {
    const message = `${createError?.code || ""} ${createError?.message || ""}`.toLowerCase();
    if (message.includes("email_exists") || message.includes("already") || message.includes("registered")) {
      return response({ ok: false, error: "account_exists" }, 409);
    }
    return response({ ok: false, error: "account_creation_failed" }, 400);
  }

  const userId = created.user.id;
  const { data: claim, error: claimError } = await admin.rpc(
    "claim_managed_client_invitation_for_user",
    { p_token: token, p_user_id: userId, p_email: email }
  );

  if (claimError || !claim) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    const failure = publicError(claimError?.message || "registration_unavailable");
    return response({ ok: false, error: failure.code }, failure.status);
  }

  const { data: signedIn, error: signInError } = await publicClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signedIn.session) {
    return response({
      ok: false,
      error: "session_creation_failed",
      account_created: true,
    }, 500);
  }

  return response({
    ok: true,
    business_id: String((claim as { business_id?: string }).business_id || ""),
    user: { id: signedIn.user.id, email: signedIn.user.email },
    session: {
      access_token: signedIn.session.access_token,
      refresh_token: signedIn.session.refresh_token,
      expires_in: signedIn.session.expires_in,
      expires_at: signedIn.session.expires_at,
      token_type: signedIn.session.token_type,
    },
  }, 201);
});
