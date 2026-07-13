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
  delivery_mode?: "self_service" | "managed" | "hybrid";
  onboarding_status?: "not_started" | "in_progress" | "ready" | "complete";
}

export type AccessibleBusiness = Business;

export async function listAccessibleBusinesses(
  supabase: SupabaseClient
): Promise<AccessibleBusiness[]> {
  const { data, error } = await supabase.rpc("list_accessible_businesses");
  if (error) throw new Error(`Could not load accessible businesses: ${error.message}`);
  return (data ?? []) as AccessibleBusiness[];
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

    const created = businesses[0];
    if (created) {
      const { error: activateError } = await supabase.rpc("activate_all_tad_departments", {
        p_business_id: created.id,
        p_delivery_mode: "self_service",
      });
      if (activateError) {
        throw new Error(`Could not activate TAD departments: ${activateError.message}`);
      }
      businesses = await listAccessibleBusinesses(supabase);
    }
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
  const business =
    businesses.find((candidate) => candidate.id === preferredId) ?? businesses[0];

  if (!business) redirect("/operator");

  if (preferredId !== business.id) {
    const { error: setError } = await supabase.rpc("set_active_business", {
      p_business_id: business.id,
    });
    if (setError) throw new Error(`Could not select workspace: ${setError.message}`);
  }

  return { supabase, business, businesses };
}
