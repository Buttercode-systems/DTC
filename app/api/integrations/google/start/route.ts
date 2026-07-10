import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { buildGoogleAuthUrl, googleConnectReady, type GoogleConnectionConfig, type GoogleSourceType } from "@/lib/integrations/google";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createSupabaseRouteClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", "/app/automation");
    return NextResponse.redirect(url, { status: 303 });
  }

  if (!googleConnectReady()) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/automation";
    url.search = "?error=google_env";
    return NextResponse.redirect(url, { status: 303 });
  }

  const sourceType = request.nextUrl.searchParams.get("source_type") as GoogleSourceType | null;
  if (sourceType !== "google_sheets" && sourceType !== "gmail") {
    const url = request.nextUrl.clone();
    url.pathname = "/app/automation";
    url.search = "?error=bad_source";
    return NextResponse.redirect(url, { status: 303 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business?.id) {
    const url = request.nextUrl.clone();
    url.pathname = "/signup";
    return NextResponse.redirect(url, { status: 303 });
  }

  const config: GoogleConnectionConfig = sourceType === "google_sheets"
    ? {
        source_type: sourceType,
        spreadsheet_id: clean(request.nextUrl.searchParams.get("spreadsheet_id"), 120),
        range: clean(request.nextUrl.searchParams.get("range"), 80) || "Sheet1!A:F",
        import_kind: request.nextUrl.searchParams.get("import_kind") === "invoices" ? "invoices" : "quotes",
      }
    : {
        source_type: sourceType,
        gmail_query: clean(request.nextUrl.searchParams.get("gmail_query"), 300) || "newer_than:14d (inquiry OR enquiry OR quote OR invoice OR payment)",
      };

  if (sourceType === "google_sheets" && !config.spreadsheet_id) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/automation";
    url.search = "?error=missing_sheet";
    return NextResponse.redirect(url, { status: 303 });
  }

  const authUrl = buildGoogleAuthUrl({
    business_id: business.id,
    source_type: sourceType,
    config,
  });

  return NextResponse.redirect(authUrl, { status: 303 });
}

function clean(value: string | null, limit: number): string {
  return String(value ?? "").trim().slice(0, limit);
}
