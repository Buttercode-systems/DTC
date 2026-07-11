"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function switchActiveBusiness(formData: FormData): Promise<void> {
  const businessId = String(formData.get("business_id") ?? "");
  if (!businessId) return;

  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("set_active_business", {
    p_business_id: businessId,
  });
  if (error) throw new Error(`Could not switch workspace: ${error.message}`);

  revalidatePath("/app", "layout");
  redirect("/app");
}
