"use server";

import { revalidatePath } from "next/cache";
import { requireOperator } from "@/lib/operator";

function text(formData: FormData, key: string, max = 500): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function integer(formData: FormData, key: string, fallback: number): number {
  const parsed = Number(text(formData, key, 10));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : fallback;
}

function refresh(): void {
  revalidatePath("/ops");
  revalidatePath("/ops/workflows");
  revalidatePath("/app");
}

export async function installWorkflow(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const businessId = text(formData, "business_id", 80);
  const templateKey = text(formData, "template_key", 100);
  if (!businessId || !templateKey) throw new Error("Client and workflow template are required.");

  const { error } = await supabase.rpc("install_workflow_template", {
    p_business_id: businessId,
    p_template_key: templateKey,
    p_name: text(formData, "name", 200) || null,
  });
  if (error) throw new Error(`Could not install workflow: ${error.message}`);
  refresh();
}

export async function createWorkflowRecord(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const instanceId = text(formData, "workflow_instance_id", 80);
  const title = text(formData, "title", 240);
  if (!instanceId || !title) throw new Error("Workflow and record title are required.");

  const detail = text(formData, "detail", 2000);
  const { error } = await supabase.rpc("create_workflow_record", {
    p_workflow_instance_id: instanceId,
    p_reference: text(formData, "reference", 120) || null,
    p_title: title,
    p_status: text(formData, "status", 120) || null,
    p_owner_label: text(formData, "owner_label", 200) || null,
    p_next_action: text(formData, "next_action", 500) || null,
    p_due_date: text(formData, "due_date", 20) || null,
    p_priority: integer(formData, "priority", 50),
    p_fields: detail ? { detail } : {},
  });
  if (error) throw new Error(`Could not create workflow record: ${error.message}`);
  refresh();
}

export async function updateWorkflowRecord(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const recordId = text(formData, "record_id", 80);
  const status = text(formData, "status", 120);
  if (!recordId || !status) throw new Error("Record and status are required.");

  const { error } = await supabase.rpc("update_workflow_record", {
    p_record_id: recordId,
    p_status: status,
    p_owner_label: text(formData, "owner_label", 200) || null,
    p_next_action: text(formData, "next_action", 500) || null,
    p_due_date: text(formData, "due_date", 20) || null,
    p_priority: integer(formData, "priority", 50),
  });
  if (error) throw new Error(`Could not update workflow record: ${error.message}`);
  refresh();
}

export async function syncWorkflowQueue(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const businessId = text(formData, "business_id", 80);
  if (!businessId) throw new Error("Client is required.");

  const { error } = await supabase.rpc("sync_workflow_actions", {
    p_business_id: businessId,
  });
  if (error) throw new Error(`Could not refresh workflow actions: ${error.message}`);
  refresh();
}
