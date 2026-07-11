"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/operator";

function text(formData: FormData, key: string, max = 1000): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function integer(formData: FormData, key: string, fallback: number): number {
  const parsed = Number(text(formData, key, 10));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : fallback;
}

function workflowData(formData: FormData): Record<string, string | number> {
  const data: Record<string, string | number> = {};
  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith("field:")) continue;
    const field = key.slice(6);
    const value = String(raw).trim();
    if (!field || !value) continue;
    const numeric = Number(value);
    data[field] = value !== "" && Number.isFinite(numeric) ? numeric : value.slice(0, 1000);
  }
  return data;
}

export async function createWorkflowItem(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const businessId = text(formData, "business_id", 80);
  const engagementId = text(formData, "engagement_id", 80);
  const title = text(formData, "title", 240);
  if (!businessId || !engagementId || !title) {
    throw new Error("Client, engagement and title are required.");
  }

  const { error } = await supabase.rpc("create_service_work_item", {
    p_business_id: businessId,
    p_engagement_id: engagementId,
    p_reference: text(formData, "reference", 80) || null,
    p_title: title,
    p_status: text(formData, "status", 120) || null,
    p_assigned_name: text(formData, "assigned_name", 160) || null,
    p_priority: integer(formData, "priority", 50),
    p_next_action: text(formData, "next_action", 500) || null,
    p_due_date: text(formData, "due_date", 20) || null,
    p_blocked_reason: text(formData, "blocked_reason", 500) || null,
    p_data: workflowData(formData),
  });
  if (error) throw new Error(`Could not create workflow item: ${error.message}`);

  revalidatePath("/ops");
  revalidatePath("/ops/workflows");
  redirect(`/ops/workflows?business=${encodeURIComponent(businessId)}`);
}

export async function updateWorkflowItem(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const itemId = text(formData, "work_item_id", 80);
  const businessId = text(formData, "business_id", 80);
  const status = text(formData, "status", 120);
  if (!itemId || !businessId || !status) {
    throw new Error("Workflow item, client and status are required.");
  }

  const existingRaw = text(formData, "existing_data", 20000);
  let existing: Record<string, string | number> = {};
  if (existingRaw) {
    try {
      existing = JSON.parse(existingRaw) as Record<string, string | number>;
    } catch {
      throw new Error("The existing workflow data is invalid.");
    }
  }

  const { error } = await supabase.rpc("update_service_work_item", {
    p_work_item_id: itemId,
    p_status: status,
    p_assigned_name: text(formData, "assigned_name", 160) || null,
    p_priority: integer(formData, "priority", 50),
    p_next_action: text(formData, "next_action", 500) || null,
    p_due_date: text(formData, "due_date", 20) || null,
    p_blocked_reason: text(formData, "blocked_reason", 500) || null,
    p_data: { ...existing, ...workflowData(formData) },
    p_note: text(formData, "note", 500) || null,
  });
  if (error) throw new Error(`Could not update workflow item: ${error.message}`);

  revalidatePath("/ops");
  revalidatePath("/ops/workflows");
  redirect(`/ops/workflows?business=${encodeURIComponent(businessId)}`);
}
