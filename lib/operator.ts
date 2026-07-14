import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const requireOperator = cache(async function requireOperatorCached(): Promise<{
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
}> {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/hq");

  let { data: allowed, error } = await supabase.rpc("is_current_tad_operator");
  if (error) throw new Error(`Could not verify operator access: ${error.message}`);

  if (!allowed) {
    const { error: claimError } = await supabase.rpc("claim_first_tad_operator");
    if (claimError) {
      throw new Error(`Could not check initial operator access: ${claimError.message}`);
    }
    const check = await supabase.rpc("is_current_tad_operator");
    if (check.error) throw new Error(`Could not verify operator access: ${check.error.message}`);
    allowed = check.data;
  }

  if (!allowed) redirect("/ops/denied");

  const { error: syncError } = await supabase.rpc("sync_all_managed_workflow_actions");
  if (syncError && !syncError.message.includes("function")) {
    throw new Error(`Could not sync managed workflow actions: ${syncError.message}`);
  }

  return { supabase, userId: user.id, email: user.email ?? null };
});
