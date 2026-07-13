"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { trackPublicEvent } from "@/lib/analytics";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export interface AuthState {
  error?: string;
  notice?: string;
}

function safeNext(value: string, fallback = "/app"): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const businessName = String(formData.get("business_name") ?? "").trim();
  const assessmentToken = String(formData.get("assessment") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? "/app"));
  const tadMode = String(formData.get("tad_mode") ?? "0") === "1" || next.startsWith("/portal");

  if (!email || password.length < 8 || !businessName) {
    return {
      error:
        "A business name, an email, and a password of at least 8 characters are needed.",
    };
  }

  if (!rateLimit(`signup:${clientIp(headers())}`, 5, 60_000)) {
    return { error: "Too many attempts. Wait a minute and try again." };
  }

  const supabase = createSupabaseServer();
  await trackPublicEvent(supabase, "signup_started", {
    path: "/signup",
    metadata: { has_assessment: Boolean(assessmentToken), tad_mode: tadMode },
  });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: tadMode ? `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://due-today-six.vercel.app"}/auth/callback?next=/portal` : undefined,
      data: {
        business_name: businessName.slice(0, 200),
        assessment_token: assessmentToken.slice(0, 64),
        tad_client_activation: tadMode,
      },
    },
  });
  if (error) return { error: error.message };

  await trackPublicEvent(supabase, "signup_created", {
    path: "/signup",
    metadata: {
      has_session: Boolean(data.session),
      has_assessment: Boolean(assessmentToken),
      tad_mode: tadMode,
    },
  });

  if (!data.session) {
    return {
      notice: tadMode
        ? "Check your email to confirm your account, then sign in to the TAD Client Portal with this same email address."
        : "Check your email to confirm your account, then sign in — your Today list will be waiting.",
    };
  }

  if (tadMode) {
    const { data: claim, error: claimError } = await supabase.rpc("claim_tad_client_access");
    if (claimError) return { error: `Could not activate Client Portal access: ${claimError.message}` };
    const result = claim as { claimed?: number } | null;
    if (!result?.claimed) {
      return {
        error:
          "No managed TAD workspace matches this email address. Use the exact primary contact email from your application or contact TAD.",
      };
    }
    redirect(next.startsWith("/portal") ? next : "/portal");
  }

  await supabase.rpc("provision_my_business", {
    p_business_name: businessName,
    p_assessment_token: assessmentToken || null,
  });
  redirect(next);
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/app"));

  if (!rateLimit(`signin:${clientIp(headers())}`, 10, 60_000)) {
    return { error: "Too many attempts. Wait a minute and try again." };
  }

  const supabase = createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
