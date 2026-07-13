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

  await requireBusiness();
  redirect("/app");
}
