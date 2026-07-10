import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

function safeNext(value: string | null): string {
  if (!value) return "/app";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNext(requestUrl.searchParams.get("next"));

  if (code) {
    const destination = request.nextUrl.clone();
    destination.pathname = next;
    destination.search = "";

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
