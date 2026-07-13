"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/db";

const DEPARTMENTS = new Set(["invoice", "sales", "client", "property", "practice", "member"]);
const MODES = new Set(["self_service", "managed"]);

function readDepartment(formData: FormData): string {
  const value = String(formData.get("department") ?? "");
  if (!DEPARTMENTS.has(value)) throw new Error("Invalid department");
  return value;
}

function readMode(formData: FormData): string {
  const value = String(formData.get("delivery_mode") ?? "self_service");
  if (!MODES.has(value)) throw new Error("Invalid delivery mode");
  return value;
}

export async function activateAllDepartments(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness();
  const mode = readMode(formData);
  const { error } = await supabase.rpc("activate_all_tad_departments", {
    p_business_id: business.id,
    p_delivery_mode: mode,
  });
  if (error) throw new Error(`Could not activate departments: ${error.message}`);
  revalidatePath("/app");
  revalidatePath("/app/departments");
  redirect("/app/departments?activated=all");
}

export async function activateDepartment(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness();
  const department = readDepartment(formData);
  const mode = readMode(formData);
  const { error } = await supabase.rpc("activate_tad_department", {
    p_business_id: business.id,
    p_department: department,
    p_delivery_mode: mode,
  });
  if (error) throw new Error(`Could not activate ${department}: ${error.message}`);
  revalidatePath("/app");
  revalidatePath("/app/departments");
}

export async function updateDepartmentMode(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness();
  const department = readDepartment(formData);
  const mode = readMode(formData);
  const enabled = String(formData.get("enabled") ?? "true") === "true";
  const { error } = await supabase.rpc("set_tad_department_mode", {
    p_business_id: business.id,
    p_department: department,
    p_delivery_mode: mode,
    p_enabled: enabled,
  });
  if (error) throw new Error(`Could not update ${department}: ${error.message}`);
  revalidatePath("/app");
  revalidatePath("/app/departments");
}
