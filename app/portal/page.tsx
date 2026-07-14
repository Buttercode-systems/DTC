import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalEntryPage() {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/portal");

  const { error: claimError } = await supabase.rpc("claim_tad_client_access");
  if (claimError) {
    throw new Error(`Could not activate Client Portal access: ${claimError.message}`);
  }

  const { business } = await requireBusiness();
  if (business.managed_by_tad) {
    const { error: platformError } = await supabase.rpc("set_business_platform", {
      p_business_id: business.id,
      p_platform_key: "tad",
    });
    if (platformError) {
      throw new Error(`Could not classify the managed workspace: ${platformError.message}`);
    }

    const { error: activateError } = await supabase.rpc("activate_all_tad_departments", {
      p_business_id: business.id,
      p_delivery_mode: "managed",
    });
    if (activateError) {
      throw new Error(`Could not activate managed departments: ${activateError.message}`);
    }
  }

  redirect("/app");
}
