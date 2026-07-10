import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { BusinessSettings } from "@/lib/engine";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Business {
  id: string;
  name: string;
  industry: string | null;
  settings: BusinessSettings;
}

const SELECT = "id, name, industry, settings";

export async function requireBusiness(): Promise<{
  supabase: SupabaseClient;
  business: Business;
}> {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: business, error } = await supabase
    .from("businesses")
    .select(SELECT)
    .eq("owner_id", user.id)
    .maybeSingle();
  // A transient query failure must not be mistaken for "not provisioned":
  // that path re-provisions or bounces a signed-in user to /signup.
  if (error) throw new Error(`Could not load your business: ${error.message}`);

  if (!business) {
    // First authenticated visit (e.g. right after email confirmation):
    // provision from the metadata captured at signup.
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const name =
      typeof meta.business_name === "string" && meta.business_name.trim()
        ? meta.business_name.trim()
        : "My business";
    const token =
      typeof meta.assessment_token === "string" && meta.assessment_token
        ? meta.assessment_token
        : null;
    await supabase.rpc("provision_my_business", {
      p_business_name: name,
      p_assessment_token: token,
    });
    const retry = await supabase
      .from("businesses")
      .select(SELECT)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (retry.error) throw new Error(`Could not load your business: ${retry.error.message}`);
    business = retry.data;
  }

  if (!business) redirect("/signup");
  return { supabase, business: business as Business };
}
