import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type AccessibleBusiness = {
  id: string;
  managed_by_tad: boolean;
};

function redirectWithCookies(url: URL, response: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const publicPortalEntry = pathname === "/portal/accept" || pathname === "/portal/join";
  const protectedRoute =
    pathname.startsWith("/app") ||
    pathname.startsWith("/ops") ||
    pathname.startsWith("/hq") ||
    (pathname.startsWith("/portal") && !publicPortalEntry) ||
    pathname.startsWith("/start");

  if (!user && protectedRoute) {
    const url = request.nextUrl.clone();
    const next = `${pathname}${request.nextUrl.search}`;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", next);
    return redirectWithCookies(url, response);
  }

  const standaloneOnlyRoutes = [
    "/app/report",
    "/app/pipeline",
    "/app/leads",
    "/app/quotes",
    "/app/invoices",
    "/app/customers",
    "/app/import",
    "/app/settings",
  ];
  const standaloneOnly = standaloneOnlyRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (user && standaloneOnly) {
    const [{ data: businesses }, { data: preference }] = await Promise.all([
      supabase.rpc("list_accessible_businesses"),
      supabase
        .from("user_preferences")
        .select("active_business_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    const accessible = (businesses ?? []) as AccessibleBusiness[];
    const preferredId = preference?.active_business_id as string | null | undefined;
    const active = accessible.find((business) => business.id === preferredId) ?? accessible[0];
    if (active?.managed_by_tad) {
      const url = request.nextUrl.clone();
      url.pathname = "/app/service";
      url.search = "";
      return redirectWithCookies(url, response);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
