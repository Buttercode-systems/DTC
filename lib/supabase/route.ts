import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export type MutableRouteResponse = NextResponse;

/**
 * Route-handler Supabase client that writes auth cookies directly onto the
 * response that will be returned to the browser.
 *
 * This is intentionally separate from `createSupabaseServer()`: route handlers
 * need explicit response cookie mutation for auth redirects to survive the
 * POST → 303 → /app handoff in production.
 */
export function createSupabaseRouteClient(request: NextRequest, response: MutableRouteResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}
