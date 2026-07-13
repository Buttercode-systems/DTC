import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { clientIp, rateLimit } from "@/lib/rate-limit";

type NextValue = FormDataEntryValue | string | null;

function safeNext(value: NextValue): string {
  const next = typeof value === "string" ? value : "/start";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/start";
}

function loginRedirect(request: NextRequest, next: string, error: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", next);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
}

function appRedirect(request: NextRequest, next: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = next;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const response = appRedirect(request, next);
  const supabase = createSupabaseRouteClient(request, response);
  const { data } = await supabase.auth.getUser();

  if (data.user) return response;
  return loginRedirect(request, next, "Sign in to continue.");
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return loginRedirect(request, next, "Enter your email and password.");
  }

  if (!rateLimit(`signin:${clientIp(request.headers)}`, 10, 60_000)) {
    return loginRedirect(request, next, "Too many attempts. Wait a minute and try again.");
  }

  const response = appRedirect(request, next);
  const supabase = createSupabaseRouteClient(request, response);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return loginRedirect(request, next, error?.message || "Could not create a sign-in session.");
  }

  return response;
}
