"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/operator";

function value(formData: FormData, key: string, max = 500): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function createClientInvitation(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const businessId = value(formData, "business_id", 80);
  const email = value(formData, "email", 320).toLowerCase();
  const role = value(formData, "role", 30) || "owner";
  if (!businessId || !email) throw new Error("Business and email are required.");

  const { data, error } = await supabase.rpc("create_managed_client_invitation", {
    p_business_id: businessId,
    p_email: email,
    p_role: role,
  });
  if (error) throw new Error(`Could not create client invitation: ${error.message}`);

  const result = data as { token?: string } | null;
  if (!result?.token) throw new Error("Invitation token was not created.");
  revalidatePath(`/ops/client/${businessId}/access`);
  redirect(`/ops/client/${businessId}/access?invite=${encodeURIComponent(result.token)}`);
}

export async function revokeClientInvitation(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const businessId = value(formData, "business_id", 80);
  const invitationId = value(formData, "invitation_id", 80);
  if (!businessId || !invitationId) throw new Error("Invitation is required.");
  const { error } = await supabase.rpc("revoke_managed_client_invitation", {
    p_invitation_id: invitationId,
  });
  if (error) throw new Error(`Could not revoke invitation: ${error.message}`);
  revalidatePath(`/ops/client/${businessId}/access`);
}

export async function deactivateClientAccess(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const businessId = value(formData, "business_id", 80);
  const userId = value(formData, "user_id", 80);
  if (!businessId || !userId) throw new Error("Client access is required.");
  const { error } = await supabase.rpc("deactivate_managed_client_access", {
    p_business_id: businessId,
    p_user_id: userId,
  });
  if (error) throw new Error(`Could not deactivate client access: ${error.message}`);
  revalidatePath(`/ops/client/${businessId}/access`);
}
