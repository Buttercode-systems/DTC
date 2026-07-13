"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/db";

const DEPARTMENTS = new Set(["invoice", "sales", "client", "property", "practice", "member"]);

function text(formData: FormData, key: string, max = 1000): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function numberValue(formData: FormData, key: string, fallback: number): number {
  const parsed = Number(formData.get(key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function workflowData(formData: FormData): Record<string, string | number | null> {
  const data: Record<string, string | number | null> = {};
  formData.forEach((raw, key) => {
    if (!key.startsWith("data.")) return;
    const field = key.slice(5);
    const value = String(raw).trim();
    data[field] = value || null;
  });
  return data;
}

function department(formData: FormData): string {
  const value = text(formData, "department", 40);
  if (!DEPARTMENTS.has(value)) throw new Error("Invalid department");
  return value;
}

function refresh(departmentKey: string): void {
  revalidatePath("/app");
  revalidatePath("/app/departments");
  revalidatePath(`/app/departments/${departmentKey}`);
}

export async function createDepartmentRecord(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness();
  const departmentKey = department(formData);
  const engagementId = text(formData, "engagement_id", 80);
  const title = text(formData, "title", 240);
  if (!engagementId || !title) throw new Error("Engagement and title are required");

  const { error } = await supabase.rpc("create_service_work_item", {
    p_business_id: business.id,
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
  if (error) throw new Error(`Could not create record: ${error.message}`);

  const { error: syncError } = await supabase.rpc("sync_service_workflow_actions", {
    p_business_id: business.id,
  });
  if (syncError) throw new Error(`Record saved but Today sync failed: ${syncError.message}`);
  refresh(departmentKey);
}

export async function updateDepartmentRecord(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness();
  const departmentKey = department(formData);
  const workItemId = text(formData, "work_item_id", 80);
  const status = text(formData, "status", 120);
  if (!workItemId || !status) throw new Error("Record and status are required");

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
  if (error) throw new Error(`Could not update record: ${error.message}`);

  const { error: syncError } = await supabase.rpc("sync_service_workflow_actions", {
    p_business_id: business.id,
  });
  if (syncError) throw new Error(`Record saved but Today sync failed: ${syncError.message}`);
  refresh(departmentKey);
}
