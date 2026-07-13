"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function claimClientInvitation(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  if (token.length < 32) throw new Error("Invitation token is invalid.");
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invite/${encodeURIComponent(token)}`);

  const { error } = await supabase.rpc("claim_managed_client_invitation", {
    p_token: token,
  });
  if (error) throw new Error(`Could not claim invitation: ${error.message}`);
  redirect("/portal");
}
