"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/db";

function text(formData: FormData, key: string, max = 1000): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function refresh(): void {
  revalidatePath("/app/service");
  revalidatePath("/app");
  revalidatePath("/ops");
}

export async function decideClientApproval(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness();
  const approvalId = text(formData, "approval_id", 80);
  const decision = text(formData, "decision", 20);
  if (!approvalId || !["approved", "rejected"].includes(decision)) {
    throw new Error("A valid approval decision is required.");
  }

  const { data, error } = await supabase.rpc("decide_client_service_approval", {
    p_approval_id: approvalId,
    p_decision: decision,
    p_note: text(formData, "decision_note", 800) || null,
  });
  if (error) throw new Error(`Could not record the decision: ${error.message}`);

  const result = data as { business_id?: string } | null;
  if (result?.business_id && result.business_id !== business.id) {
    throw new Error("The approval does not belong to the active workspace.");
  }
  refresh();
}

export async function respondToServiceReport(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness();
  const reportId = text(formData, "report_id", 80);
  const response = text(formData, "response", 20);
  if (!reportId || !["continue", "change", "stop"].includes(response)) {
    throw new Error("Choose continue, change or stop.");
  }

  const { data, error } = await supabase.rpc("respond_to_service_report", {
    p_report_id: reportId,
    p_response: response,
    p_note: text(formData, "response_note", 1200) || null,
  });
  if (error) throw new Error(`Could not save the report response: ${error.message}`);

  const result = data as { business_id?: string } | null;
  if (result?.business_id && result.business_id !== business.id) {
    throw new Error("The report does not belong to the active workspace.");
  }
  refresh();
}
