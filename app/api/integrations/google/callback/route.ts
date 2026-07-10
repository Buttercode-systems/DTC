import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { exchangeGoogleCode, googleAccountEmail, googleScopes, parseGoogleState, saveGoogleSecret } from "@/lib/integrations/google";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const parsed = state ? parseGoogleState(state) : null;

  if (!code || !parsed) return redirectAutomation(request, "?error=google_callback");

  const response = NextResponse.next();
  const supabase = createSupabaseRouteClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirectLogin(request);

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", parsed.business_id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business?.id) return redirectAutomation(request, "?error=business_mismatch");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return redirectAutomation(request, "?error=service_role_missing");

  const token = await exchangeGoogleCode(code);
  if (!token.access_token) return redirectAutomation(request, "?error=google_token");

  const accountEmail = await googleAccountEmail(token.access_token);
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const displayName = parsed.source_type === "google_sheets"
    ? `Google Sheets${parsed.config.spreadsheet_id ? ` · ${parsed.config.spreadsheet_id}` : ""}`
    : `Gmail${accountEmail ? ` · ${accountEmail}` : ""}`;

  const { data: existing } = await admin
    .from("source_connections")
    .select("id")
    .eq("business_id", business.id)
    .eq("source_type", parsed.source_type)
    .eq("external_account_id", accountEmail ?? "google")
    .maybeSingle();

  const connectionPayload = {
    business_id: business.id,
    source_type: parsed.source_type,
    display_name: displayName.slice(0, 160),
    status: "active",
    config: parsed.config,
    external_account_id: accountEmail ?? "google",
    last_error: null,
    updated_at: new Date().toISOString(),
  };

  const connectionResult = existing?.id
    ? await admin.from("source_connections").update(connectionPayload).eq("id", existing.id).select("id").single()
    : await admin.from("source_connections").insert(connectionPayload).select("id").single();

  const connectionId = connectionResult.data?.id;
  if (!connectionId) return redirectAutomation(request, "?error=connection_save");

  await saveGoogleSecret(admin, {
    connectionId,
    businessId: business.id,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    expiresIn: token.expires_in,
    tokenType: token.token_type,
    scopes: token.scope ? token.scope.split(" ") : googleScopes(parsed.source_type),
  });

  await admin.from("action_audit_log").insert({
    business_id: business.id,
    actor_type: "user",
    actor_id: user.id,
    event_name: "source_connected",
    metadata: { source_type: parsed.source_type, account: accountEmail },
  });

  return redirectAutomation(request, `?connected=${parsed.source_type}`);
}

function redirectAutomation(request: NextRequest, search: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/app/automation";
  url.search = search;
  return NextResponse.redirect(url, { status: 303 });
}

function redirectLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", "/app/automation");
  return NextResponse.redirect(url, { status: 303 });
}
