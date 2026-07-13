"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireOperator } from "@/lib/operator";

export type InvitationState = {
  error?: string;
  invitationUrl?: string;
  email?: string;
  expiresAt?: string;
  delivery?: "sent" | "manual";
  notice?: string;
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

async function sendInvitationEmail(input: {
  to: string;
  businessName: string;
  role: string;
  invitationUrl: string;
  expiresAt?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || process.env.DAILY_BRIEF_FROM;
  if (!apiKey || !from) return false;

  const expiry = input.expiresAt
    ? new Intl.DateTimeFormat("en-ZA", {
        timeZone: "Africa/Johannesburg",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(input.expiresAt))
    : "seven days after it was created";

  const text = [
    "You have been invited to The Admin Department Client Portal.",
    "",
    `Business: ${input.businessName}`,
    `Portal role: ${input.role}`,
    `Invitation expires: ${expiry}`,
    "",
    "Open the private invitation:",
    input.invitationUrl,
    "",
    "The link only works with this exact email address. Do not forward it. The Admin Department runs the operational workflow; your business keeps control of approvals and service decisions.",
    "",
    "The Admin Department",
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: `Your Client Portal access — ${input.businessName}`,
        text,
      }),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
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

  const [invitationResult, businessResult] = await Promise.all([
    supabase.rpc("create_managed_client_invitation", {
      p_business_id: businessId,
      p_email: email,
      p_role: role,
    }),
    supabase.from("businesses").select("name").eq("id", businessId).maybeSingle(),
  ]);
  if (invitationResult.error) return { error: invitationResult.error.message };

  const invitation = invitationResult.data as { token?: string; expires_at?: string } | null;
  if (!invitation?.token) return { error: "The invitation link was not created." };

  const invitationUrl = `${appOrigin()}/portal/accept?token=${encodeURIComponent(invitation.token)}`;
  const businessName = businessResult.data?.name || "your managed workspace";
  const sent = await sendInvitationEmail({
    to: email,
    businessName,
    role,
    invitationUrl,
    expiresAt: invitation.expires_at,
  });

  revalidatePath(`/ops/client/${businessId}/access`);
  revalidatePath("/ops/access");
  return {
    invitationUrl,
    email,
    expiresAt: invitation.expires_at,
    delivery: sent ? "sent" : "manual",
    notice: sent
      ? `Invitation email sent to ${email}.`
      : `The secure link was created, but email delivery was not confirmed. Copy and send it manually to ${email}.`,
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
