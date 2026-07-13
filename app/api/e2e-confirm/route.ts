import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const token = String(request.nextUrl.searchParams.get("token") ?? "").trim();
  if (!/^[a-f0-9]{40,128}$/i.test(token)) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json({ ok: false, error: "auth_unavailable" }, { status: 503 });
  }

  const redirectTo = new URL("/login", request.nextUrl.origin).toString();
  const verify = new URL("/auth/v1/verify", supabaseUrl);
  verify.searchParams.set("token", token);
  verify.searchParams.set("type", "signup");
  verify.searchParams.set("redirect_to", redirectTo);

  const response = await fetch(verify, {
    method: "GET",
    redirect: "manual",
    headers: { "User-Agent": "TAD preview E2E confirmation relay" },
  });
  const location = response.headers.get("location") ?? "";
  const ok = response.status >= 300 && response.status < 400 && !location.includes("error=");
  return NextResponse.json(
    { ok, status: response.status, redirected_to_login: location.includes("/login") },
    { status: ok ? 200 : 400, headers: { "Cache-Control": "no-store" } }
  );
}
