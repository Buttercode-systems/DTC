"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type JoinState = {
  error?: string;
  notice?: string;
};

function appOrigin(): string {
  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://due-today-six.vercel.app";
}

export async function joinManagedClient(
  _previous: JoinState,
  formData: FormData
): Promise<JoinState> {
  const token = String(formData.get("token") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const passphrase = String(formData.get("passphrase") ?? "");

  if (!token || !email || passphrase.length < 8) {
    return { error: "Use the invited email and a passphrase of at least 8 characters." };
  }
  if (!rateLimit(`managed-signup:${clientIp(headers())}`, 5, 60_000)) {
    return { error: "Too many attempts. Wait a minute and try again." };
  }

  const supabase = createSupabaseServer();
  const { data: invitation, error: invitationError } = await supabase.rpc(
    "get_managed_client_invitation",
    { p_token: token }
  );
  const expectedEmail = String((invitation as { email?: string } | null)?.email ?? "").toLowerCase();
  if (invitationError || !expectedEmail) return { error: "This invitation is no longer valid." };
  if (email !== expectedEmail) return { error: "Use the exact email address named in the invitation." };

  const next = `/portal/accept?token=${encodeURIComponent(token)}`;
  const emailRedirectTo = `${appOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: passphrase,
    options: {
      emailRedirectTo,
      data: { managed_invitation: true },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "An account already exists for this email. Sign in instead." };
    }
    return { error: error.message };
  }

  if (!data.session) {
    return {
      notice: "Check your email to confirm the account. The confirmation link will return you to this invitation.",
    };
  }

  const { error: claimError } = await supabase.rpc("claim_managed_client_invitation", {
    p_token: token,
  });
  if (claimError) return { error: claimError.message };

  redirect("/app/service");
}
