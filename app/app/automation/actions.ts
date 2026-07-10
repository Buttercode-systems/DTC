"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";
import { syncConnectionById } from "@/lib/integrations/sync";

export async function updateAutomationSettings(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness();

  const dailyBriefEnabled = formData.get("daily_brief_enabled") === "on";
  const dailyBriefTime = cleanTime(String(formData.get("daily_brief_time") ?? "07:30"));
  const timezone = cleanText(String(formData.get("timezone") ?? "Africa/Johannesburg"), 80) || "Africa/Johannesburg";
  const dailyBriefChannel = allowed(
    String(formData.get("daily_brief_channel") ?? "email"),
    ["email", "in_app"]
  );
  const customerMessageMode = allowed(
    String(formData.get("customer_message_mode") ?? "draft_only"),
    ["manual_only", "draft_only", "approved_send", "autopilot_internal_only"]
  );
  const approvedSendEnabled = formData.get("approved_send_enabled") === "on";
  const requestedAutopilot = formData.get("autopilot_enabled") === "on";
  const autopilotEnabled = requestedAutopilot && customerMessageMode === "autopilot_internal_only";
  const quietHoursStart = cleanTime(String(formData.get("quiet_hours_start") ?? "18:00"));
  const quietHoursEnd = cleanTime(String(formData.get("quiet_hours_end") ?? "07:00"));
  const maxCustomerMessages = clamp(Number(formData.get("max_customer_messages_per_day") ?? 10), 0, 50);
  const pauseUntilRaw = String(formData.get("pause_until") ?? "").trim();

  const { error } = await supabase.from("automation_settings").upsert({
    business_id: business.id,
    daily_brief_enabled: dailyBriefEnabled,
    daily_brief_time: dailyBriefTime,
    timezone,
    daily_brief_channel: dailyBriefChannel,
    customer_message_mode: customerMessageMode,
    approved_send_enabled: approvedSendEnabled && customerMessageMode === "approved_send",
    autopilot_enabled: autopilotEnabled,
    require_approval_for_customer_messages: true,
    quiet_hours_start: quietHoursStart,
    quiet_hours_end: quietHoursEnd,
    max_customer_messages_per_day: maxCustomerMessages,
    pause_until: pauseUntilRaw ? new Date(pauseUntilRaw).toISOString() : null,
    updated_at: new Date().toISOString(),
  });

  if (!error) {
    await supabase.from("action_audit_log").insert({
      business_id: business.id,
      actor_type: "user",
      event_name: "automation_settings_updated",
      metadata: {
        daily_brief_enabled: dailyBriefEnabled,
        daily_brief_channel: dailyBriefChannel,
        customer_message_mode: customerMessageMode,
        approved_send_enabled: approvedSendEnabled && customerMessageMode === "approved_send",
        autopilot_enabled: autopilotEnabled,
        guardrail: "internal_autopilot_only_no_customer_send",
      },
    });
    await trackEvent(supabase, "automation_settings_updated", {
      businessId: business.id,
      path: "/app/automation",
      metadata: { daily_brief_enabled: dailyBriefEnabled, customer_message_mode: customerMessageMode, autopilot_enabled: autopilotEnabled },
    });
  }

  revalidatePath("/app/automation");
  redirect(error ? "/app/automation?error=settings" : "/app/automation?saved=settings");
}

export async function syncSourceNow(formData: FormData): Promise<void> {
  const { business } = await requireBusiness();
  const connectionId = cleanText(String(formData.get("connection_id") ?? ""), 80);
  if (!connectionId) redirect("/app/automation?error=sync");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) redirect("/app/automation?error=service_role_missing");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await syncConnectionById(admin, connectionId, { businessId: business.id, runType: "manual" });

  revalidatePath("/app");
  revalidatePath("/app/automation");
  revalidatePath("/app/leads");
  revalidatePath("/app/quotes");
  revalidatePath("/app/invoices");
  redirect(result.ok ? `/app/automation?synced=${result.source_type}` : `/app/automation?error=${encodeURIComponent(result.error ?? "sync")}`);
}

function allowed<T extends string>(value: string, values: readonly T[]): T {
  return values.includes(value as T) ? (value as T) : values[0];
}

function cleanText(value: string, limit: number): string {
  return value.trim().slice(0, limit);
}

function cleanTime(value: string): string {
  return /^\d{2}:\d{2}$/.test(value) ? value : "07:30";
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
