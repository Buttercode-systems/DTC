"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function acceptInvitation(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) throw new Error("Invitation token is required");

  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  const { error } = await supabase.rpc("accept_workspace_invitation", {
    p_token: token,
  });
  if (error) throw new Error(`Could not accept invitation: ${error.message}`);
  redirect("/app");
}
