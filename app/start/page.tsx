import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/start");

  const { data: operator, error } = await supabase.rpc("is_current_tad_operator");
  if (error) throw new Error(`Could not resolve account access: ${error.message}`);
  if (operator) redirect("/ops");

  const { business } = await requireBusiness();
  redirect(business.managed_by_tad ? "/app/service" : "/app");
}
