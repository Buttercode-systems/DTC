"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { trackPublicEvent } from "@/lib/analytics";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { safeRelativeDestination } from "@/lib/safe-next";

export interface AuthState {
  error?: string;
  notice?: string;
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const businessName = String(formData.get("business_name") ?? "").trim();
  const assessmentToken = String(formData.get("assessment") ?? "").trim();

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
    metadata: { has_assessment: Boolean(assessmentToken) },
  });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        business_name: businessName.slice(0, 200),
        assessment_token: assessmentToken.slice(0, 64),
      },
    },
  });
  if (error) return { error: error.message };

  await trackPublicEvent(supabase, "signup_created", {
    path: "/signup",
    metadata: { has_session: Boolean(data.session), has_assessment: Boolean(assessmentToken) },
  });

  if (!data.session) {
    return {
      notice:
        "Check your email to confirm your account, then sign in — your Today list will be waiting.",
    };
  }

  await supabase.rpc("provision_my_business", {
    p_business_name: businessName,
    p_assessment_token: assessmentToken || null,
  });
  redirect("/app");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeRelativeDestination(String(formData.get("next") ?? "/app"), "/app");

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
