"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireOperator } from "@/lib/operator";

export type InvitationState = {
  error?: string;
  invitationUrl?: string;
  email?: string;
  expiresAt?: string;
};

function value(formData: FormData, key: string, max = 500): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function appOrigin(): string {
  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://due-today-six.vercel.app";
}

export async function createClientInvitation(
  _previous: InvitationState,
  formData: FormData
): Promise<InvitationState> {
  const { supabase } = await requireOperator();
  const businessId = value(formData, "business_id", 80);
  const email = value(formData, "email", 320).toLowerCase();
  const role = value(formData, "role", 30) || "owner";
  if (!businessId || !email) return { error: "Business and client email are required." };

  const { data, error } = await supabase.rpc("create_managed_client_invitation", {
    p_business_id: businessId,
    p_email: email,
    p_role: role,
  });
  if (error) return { error: error.message };

  const invitation = data as { token?: string; expires_at?: string } | null;
  if (!invitation?.token) return { error: "The invitation link was not created." };

  revalidatePath(`/ops/client/${businessId}/access`);
  revalidatePath("/ops/access");
  return {
    invitationUrl: `${appOrigin()}/portal/accept?token=${encodeURIComponent(invitation.token)}`,
    email,
    expiresAt: invitation.expires_at,
  };
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
  revalidatePath("/ops/access");
}

export async function deactivateClientAccess(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const businessId = value(formData, "business_id", 80);
  const userId = value(formData, "user_id", 80);
  if (!businessId || !userId) throw new Error("Client access record is required.");

  const { error } = await supabase.rpc("deactivate_managed_client_access", {
    p_business_id: businessId,
    p_user_id: userId,
  });
  if (error) throw new Error(`Could not deactivate access: ${error.message}`);
  revalidatePath(`/ops/client/${businessId}/access`);
  revalidatePath("/ops/access");
}
