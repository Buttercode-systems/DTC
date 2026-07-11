"use server";

import { revalidatePath } from "next/cache";
import { requireOperator } from "@/lib/operator";

function text(formData: FormData, key: string, max = 1000): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function numberValue(formData: FormData, key: string, fallback: number): number {
  const parsed = Number(formData.get(key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function workflowData(formData: FormData): Record<string, string | number | null> {
  const data: Record<string, string | number | null> = {};
  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith("data.")) continue;
    const field = key.slice(5);
    const value = String(raw).trim();
    data[field] = value || null;
  }
  return data;
}

function refreshWorkflow(businessId: string): void {
  revalidatePath("/ops");
  revalidatePath(`/ops/client/${businessId}`);
  revalidatePath("/app");
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
    p_assigned_name: text(formData, "assigned_name", 200) || null,
    p_priority: Math.max(0, Math.min(100, numberValue(formData, "priority", 50))),
    p_next_action: text(formData, "next_action", 500) || null,
    p_due_date: text(formData, "due_date", 20) || null,
    p_blocked_reason: text(formData, "blocked_reason", 500) || null,
    p_data: workflowData(formData),
  });
  if (error) throw new Error(`Could not create workflow record: ${error.message}`);

  const { error: syncError } = await supabase.rpc("sync_service_workflow_actions", {
    p_business_id: businessId,
  });
  if (syncError) throw new Error(`Record saved but queue sync failed: ${syncError.message}`);
  refreshWorkflow(businessId);
}

export async function updateWorkflowItem(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const businessId = text(formData, "business_id", 80);
  const workItemId = text(formData, "work_item_id", 80);
  const status = text(formData, "status", 120);
  if (!businessId || !workItemId || !status) {
    throw new Error("Client, workflow record and status are required.");
  }

  const { error } = await supabase.rpc("update_service_work_item", {
    p_work_item_id: workItemId,
    p_status: status,
    p_assigned_name: text(formData, "assigned_name", 200) || null,
    p_priority: Math.max(0, Math.min(100, numberValue(formData, "priority", 50))),
    p_next_action: text(formData, "next_action", 500) || null,
    p_due_date: text(formData, "due_date", 20) || null,
    p_blocked_reason: text(formData, "blocked_reason", 500) || null,
    p_data: workflowData(formData),
    p_note: text(formData, "note", 800) || null,
  });
  if (error) throw new Error(`Could not update workflow record: ${error.message}`);

  const { error: syncError } = await supabase.rpc("sync_service_workflow_actions", {
    p_business_id: businessId,
  });
  if (syncError) throw new Error(`Record saved but queue sync failed: ${syncError.message}`);
  refreshWorkflow(businessId);
}
