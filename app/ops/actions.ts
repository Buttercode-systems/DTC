"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/operator";

function value(formData: FormData, key: string, max = 500): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function createManagedBusiness(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const name = value(formData, "name", 200);
  const department = value(formData, "department", 30);
  const serviceLevel = value(formData, "service_level", 30) || "setup";
  if (!name) throw new Error("Business name is required.");

  const { error } = await supabase.rpc("create_managed_business", {
    p_name: name,
    p_industry: value(formData, "industry", 120),
    p_contact_name: value(formData, "contact_name", 200),
    p_contact_email: value(formData, "contact_email", 320),
    p_department: department,
    p_service_level: serviceLevel,
  });
  if (error) throw new Error(`Could not onboard client: ${error.message}`);
  revalidatePath("/ops");
  revalidatePath("/ops/workflows");
}

export async function openManagedBusiness(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const businessId = value(formData, "business_id", 80);
  if (!businessId) return;
  const { error } = await supabase.rpc("set_active_business", {
    p_business_id: businessId,
  });
  if (error) throw new Error(`Could not select client workspace: ${error.message}`);
  redirect("/app");
}

export async function recordOpsOutcome(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const actionId = value(formData, "action_id", 80);
  const outcomeCode = value(formData, "outcome_code", 40) || "completed";
  const nextDate = value(formData, "next_action_date", 20);
  if (!actionId) throw new Error("Action is required.");

  const { error } = await supabase.rpc("complete_action_with_outcome_v2", {
    p_action_id: actionId,
    p_outcome_code: outcomeCode,
    p_outcome_note: value(formData, "outcome_note", 1000) || null,
    p_next_action_date: nextDate || null,
  });
  if (error) throw new Error(`Could not record action outcome: ${error.message}`);
  revalidatePath("/ops");
  revalidatePath("/ops/workflows");
  revalidatePath("/app");
}

export async function requestServiceApproval(formData: FormData): Promise<void> {
  const { supabase, userId } = await requireOperator();
  const businessId = value(formData, "business_id", 80);
  const title = value(formData, "title", 200);
  if (!businessId || !title) throw new Error("Client and approval title are required.");

  const amountRaw = value(formData, "amount", 40);
  const amount = amountRaw ? Number(amountRaw) : null;
  const { error } = await supabase.from("service_approvals").insert({
    business_id: businessId,
    title,
    detail: value(formData, "detail", 1200) || null,
    amount: Number.isFinite(amount) ? amount : null,
    due_date: value(formData, "due_date", 20) || null,
    requested_by: userId,
    status: "pending",
  });
  if (error) throw new Error(`Could not request approval: ${error.message}`);
  revalidatePath("/ops");
}

export async function decideServiceApproval(formData: FormData): Promise<void> {
  const { supabase, userId } = await requireOperator();
  const approvalId = value(formData, "approval_id", 80);
  const decision = value(formData, "decision", 20);
  if (!approvalId || !["approved", "rejected"].includes(decision)) {
    throw new Error("Valid approval decision required.");
  }

  const { error } = await supabase
    .from("service_approvals")
    .update({
      status: decision,
      decision_note: value(formData, "decision_note", 500) || null,
      decided_by: userId,
      decided_at: new Date().toISOString(),
    })
    .eq("id", approvalId)
    .eq("status", "pending");
  if (error) throw new Error(`Could not record approval decision: ${error.message}`);
  revalidatePath("/ops");
}

export async function generateServiceReport(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const businessId = value(formData, "business_id", 80);
  const periodEnd = value(formData, "period_end", 20);
  const periodStart = value(formData, "period_start", 20);
  if (!businessId || !periodStart || !periodEnd) {
    throw new Error("Client and reporting period are required.");
  }

  const { error } = await supabase.rpc("generate_weekly_service_report", {
    p_business_id: businessId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });
  if (error) throw new Error(`Could not generate report: ${error.message}`);
  revalidatePath("/ops");
}
