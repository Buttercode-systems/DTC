"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type JoinState = {
  error?: string;
};

type RegistrationResponse = {
  ok?: boolean;
  error?: string;
  session?: {
    access_token?: string;
    refresh_token?: string;
  };
};

const ERROR_MESSAGES: Record<string, string> = {
  invitation_email_mismatch: "Use the exact email address named in the invitation.",
  invitation_expired: "This invitation has expired. Ask The Admin Department for a new link.",
  invitation_not_pending: "This invitation has already been used or revoked.",
  invitation_not_found: "This invitation is no longer valid.",
  registration_attempt_limit_reached: "This invitation has reached its attempt limit. Ask The Admin Department for a new link.",
  account_exists: "An account already exists for this email. Return to the invitation and sign in instead.",
  invalid_registration_details: "Use the invited email and a secure passphrase of at least 12 characters with upper-case, lower-case and number characters.",
  session_creation_failed: "Your account was created, but the session could not start. Return to the invitation and sign in.",
  account_creation_failed: "The Client Portal account could not be created. Review the passphrase and try again.",
  registration_configuration_missing: "Client registration is temporarily unavailable. Contact The Admin Department.",
  registration_unavailable: "Client registration is temporarily unavailable. Try again or contact The Admin Department.",
};

export async function joinManagedClient(
  _previous: JoinState,
  formData: FormData
): Promise<JoinState> {
  const token = String(formData.get("token") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const passphrase = String(formData.get("passphrase") ?? "");

  if (
    token.length < 32 ||
    !email ||
    passphrase.length < 12 ||
    passphrase.length > 128 ||
    !/[a-z]/.test(passphrase) ||
    !/[A-Z]/.test(passphrase) ||
    !/\d/.test(passphrase)
  ) {
    return { error: ERROR_MESSAGES.invalid_registration_details };
  }
  if (!rateLimit(`managed-signup:${clientIp(headers())}`, 5, 60_000)) {
    return { error: "Too many attempts. Wait a minute and try again." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !publishableKey) {
    return { error: ERROR_MESSAGES.registration_configuration_missing };
  }

  let result: RegistrationResponse;
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/managed-client-register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: publishableKey,
      },
      body: JSON.stringify({ token, email, password: passphrase }),
      cache: "no-store",
    });
    result = (await response.json()) as RegistrationResponse;
    if (!response.ok || !result.ok) {
      return {
        error: ERROR_MESSAGES[result.error ?? "registration_unavailable"] ?? ERROR_MESSAGES.registration_unavailable,
      };
    }
  } catch {
    return { error: ERROR_MESSAGES.registration_unavailable };
  }

  const accessToken = result.session?.access_token;
  const refreshToken = result.session?.refresh_token;
  if (!accessToken || !refreshToken) {
    return { error: ERROR_MESSAGES.session_creation_failed };
  }

  const supabase = createSupabaseServer();
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) return { error: ERROR_MESSAGES.session_creation_failed };

  redirect("/app/service");
}
