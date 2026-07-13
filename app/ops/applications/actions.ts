"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/operator";

function value(formData: FormData, key: string, max = 1000): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function refresh(): void {
  revalidatePath("/ops/applications");
  revalidatePath("/ops");
}

export async function updateTadApplication(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const applicationId = value(formData, "application_id", 80);
  const status = value(formData, "status", 30);
  const commercialDecision = value(formData, "commercial_decision", 30) || "pending";
  if (!applicationId) throw new Error("Application is required.");

  const { error } = await supabase.rpc("update_tad_application", {
    p_application_id: applicationId,
    p_status: status,
    p_qualification_notes: value(formData, "qualification_notes", 2000) || null,
    p_commercial_decision: commercialDecision,
  });
  if (error) throw new Error(`Could not update application: ${error.message}`);
  refresh();
}

export async function startTadApplicationOnboarding(formData: FormData): Promise<void> {
  const { supabase } = await requireOperator();
  const applicationId = value(formData, "application_id", 80);
  if (!applicationId) throw new Error("Application is required.");

  const { data, error } = await supabase.rpc("start_tad_application_onboarding", {
    p_application_id: applicationId,
  });
  if (error) throw new Error(`Could not start onboarding: ${error.message}`);

  const result = data as { business_id?: string } | null;
  if (!result?.business_id) throw new Error("Managed workspace was not created.");
  refresh();
  redirect(`/ops/client/${result.business_id}`);
}
