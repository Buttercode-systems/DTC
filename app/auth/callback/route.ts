import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { applyRelativeDestination, safeRelativeDestination } from "@/lib/safe-next";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRelativeDestination(requestUrl.searchParams.get("next"), "/start");

  if (code) {
    const destination = applyRelativeDestination(request.nextUrl.clone(), next);
    const response = NextResponse.redirect(destination, { status: 303 });
    const supabase = createSupabaseRouteClient(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) return response;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", next);
  url.searchParams.set("error", "Your confirmation link expired or could not be completed. Please sign in.");
  return NextResponse.redirect(url, { status: 303 });
}
