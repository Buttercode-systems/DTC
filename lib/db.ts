import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { BusinessSettings } from "@/lib/engine";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Business {
  id: string;
  name: string;
  industry: string | null;
  settings: BusinessSettings;
  managed_by_tad: boolean;
  service_status: string;
  platform_key: "duetoday" | "tad";
  delivery_mode?: "self_service" | "managed" | "hybrid";
  onboarding_status?: "not_started" | "in_progress" | "ready" | "complete";
}

export type AccessibleBusiness = Business;

export async function listAccessibleBusinesses(
  supabase: SupabaseClient
): Promise<AccessibleBusiness[]> {
  const { data, error } = await supabase.rpc("list_accessible_businesses");
  if (error) throw new Error(`Could not load accessible businesses: ${error.message}`);
  return ((data ?? []) as Array<Omit<AccessibleBusiness, "platform_key"> & { platform_key?: "duetoday" | "tad" }>).map(
    (business) => ({ ...business, platform_key: business.platform_key ?? "duetoday" })
  );
}

export async function requireBusiness(): Promise<{
  supabase: SupabaseClient;
  business: Business;
  businesses: AccessibleBusiness[];
}> {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let businesses = await listAccessibleBusinesses(supabase);

  if (businesses.length === 0) {
    const { data: operator, error: operatorError } = await supabase.rpc(
      "is_current_tad_operator"
    );
    if (operatorError) {
      throw new Error(`Could not check operator access: ${operatorError.message}`);
    }
    if (operator) redirect("/operator");

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const name =
      typeof meta.business_name === "string" && meta.business_name.trim()
        ? meta.business_name.trim()
        : "My business";
    const token =
      typeof meta.assessment_token === "string" && meta.assessment_token
        ? meta.assessment_token
        : null;

    const { error: provisionError } = await supabase.rpc("provision_my_business", {
      p_business_name: name,
      p_assessment_token: token,
    });
    if (provisionError) {
      throw new Error(`Could not provision your business: ${provisionError.message}`);
    }
    businesses = await listAccessibleBusinesses(supabase);
  }

  const { data: preference, error: preferenceError } = await supabase
    .from("user_preferences")
    .select("active_business_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (preferenceError) {
    throw new Error(`Could not load workspace preference: ${preferenceError.message}`);
  }

  const preferredId = preference?.active_business_id as string | null | undefined;
  const selected =
    businesses.find((candidate) => candidate.id === preferredId) ?? businesses[0];

  if (!selected) redirect("/operator");

  if (preferredId !== selected.id) {
    const { error: setError } = await supabase.rpc("set_active_business", {
      p_business_id: selected.id,
    });
    if (setError) throw new Error(`Could not select workspace: ${setError.message}`);
  }

  const { data: platform, error: platformError } = await supabase.rpc(
    "get_business_platform",
    { p_business_id: selected.id }
  );
  if (platformError) {
    throw new Error(`Could not resolve workspace platform: ${platformError.message}`);
  }

  const business: Business = {
    ...selected,
    platform_key: platform === "tad" ? "tad" : "duetoday",
  };
  businesses = businesses.map((candidate) =>
    candidate.id === business.id ? business : candidate
  );

  return { supabase, business, businesses };
}
