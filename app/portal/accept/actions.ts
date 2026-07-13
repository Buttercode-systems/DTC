"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export type ClaimState = { error?: string };

function message(value: string): string {
  if (value.includes("invitation_email_mismatch")) {
    return "This invitation belongs to a different email address. Sign out and use the exact invited email.";
  }
  if (value.includes("invitation_expired")) return "This invitation expired. Ask The Admin Department for a new link.";
  if (value.includes("invitation_not_pending")) return "This invitation has already been used or revoked.";
  if (value.includes("invitation_not_found")) return "This invitation link is not valid.";
  if (value.includes("not_authenticated")) return "Sign in before accepting the invitation.";
  return value;
}

export async function claimInvitation(
  _previous: ClaimState,
  formData: FormData
): Promise<ClaimState> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { error: "Invitation token is missing." };

  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in before accepting the invitation." };

  const { error } = await supabase.rpc("claim_managed_client_invitation", {
    p_token: token,
  });
  if (error) return { error: message(error.message) };

  redirect("/app/service");
}
