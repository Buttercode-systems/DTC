"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/db";
import { assertTadPlatform } from "@/lib/platform";

const ROLES = new Set(["manager", "member", "viewer"]);

function text(formData: FormData, key: string, max = 500): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function createInvitation(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness();
  assertTadPlatform(business.platform_key);
  const email = text(formData, "email", 320).toLowerCase();
  const role = text(formData, "role", 30);
  if (!email || !ROLES.has(role)) throw new Error("A valid email and role are required");

  const { data, error } = await supabase.rpc("create_workspace_invitation", {
    p_business_id: business.id,
    p_email: email,
    p_role: role,
  });
  if (error) throw new Error(`Could not create invitation: ${error.message}`);
  const invitation = data as { token: string };
  revalidatePath("/app/team");
  redirect(`/app/team?invite=${encodeURIComponent(invitation.token)}`);
}

export async function revokeInvitation(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness();
  assertTadPlatform(business.platform_key);
  const invitationId = text(formData, "invitation_id", 80);
  const { error } = await supabase.rpc("revoke_workspace_invitation", {
    p_invitation_id: invitationId,
  });
  if (error) throw new Error(`Could not revoke invitation: ${error.message}`);
  revalidatePath("/app/team");
}

export async function updateMember(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness();
  assertTadPlatform(business.platform_key);
  const userId = text(formData, "user_id", 80);
  const role = text(formData, "role", 30);
  const active = text(formData, "active", 10) === "true";
  if (!userId || !ROLES.has(role)) throw new Error("Member and role are required");

  const { error } = await supabase.rpc("update_workspace_member_role", {
    p_business_id: business.id,
    p_user_id: userId,
    p_role: role,
    p_active: active,
  });
  if (error) throw new Error(`Could not update member: ${error.message}`);
  revalidatePath("/app/team");
}
