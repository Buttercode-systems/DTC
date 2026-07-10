import type { SupabaseClient } from "@supabase/supabase-js";

export type AnalyticsMetadata = Record<string, unknown>;

export async function trackEvent(
  supabase: SupabaseClient,
  eventName: string,
  options: {
    businessId?: string | null;
    path?: string | null;
    metadata?: AnalyticsMetadata;
  } = {}
): Promise<void> {
  const safeName = eventName.trim().slice(0, 80);
  if (!safeName) return;

  try {
    await supabase.from("analytics_events").insert({
      event_name: safeName,
      business_id: options.businessId ?? null,
      path: options.path ?? null,
      metadata: sanitizeMetadata(options.metadata),
    });
  } catch {
    // Analytics must never break the product journey.
  }
}

// Funnel events fired before a user exists (assessment, report, signup).
// Direct inserts are owner-only under RLS, so these go through the
// whitelisted track_public_event definer function instead.
export async function trackPublicEvent(
  supabase: SupabaseClient,
  eventName: string,
  options: { path?: string | null; metadata?: AnalyticsMetadata } = {}
): Promise<void> {
  const safeName = eventName.trim().slice(0, 80);
  if (!safeName) return;

  try {
    await supabase.rpc("track_public_event", {
      p_event_name: safeName,
      p_path: options.path ?? null,
      p_metadata: sanitizeMetadata(options.metadata),
    });
  } catch {
    // Analytics must never break the product journey.
  }
}

function sanitizeMetadata(metadata: AnalyticsMetadata | undefined): AnalyticsMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};

  const clean: AnalyticsMetadata = {};
  for (const [key, value] of Object.entries(metadata).slice(0, 20)) {
    if (typeof value === "string") clean[key] = value.slice(0, 500);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) clean[key] = value;
  }
  return clean;
}
