import { createClient } from "@supabase/supabase-js";
import { syncActiveSourcesForBusiness } from "@/lib/integrations/sync";

export const dynamic = "force-dynamic";

type AutomationSetting = {
  business_id: string;
  daily_brief_enabled: boolean;
  daily_brief_time: string;
  timezone: string | null;
  daily_brief_channel: string;
  pause_until: string | null;
  autopilot_enabled: boolean;
};

type BusinessRow = {
  id: string;
  name: string;
  owner_id: string;
};

type ActionRow = { kind: string };

type QueueResult = {
  business_id: string;
  queued: boolean;
  reason: string;
  action_count?: number;
  sync_count?: number;
};

type AdminClient = ReturnType<typeof createClient>;

const MONEY_KINDS = new Set([
  "invoice_chase",
  "promise_check",
  "quote_followup",
  "quote_expired",
  "recurring_invoice",
]);

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!secret) {
    return Response.json(
      { ok: false, error: "cron_secret_not_configured" },
      { status: 503 }
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!serviceKey || !supabaseUrl) {
    return Response.json(
      { ok: false, error: "supabase_admin_not_configured" },
      { status: 503 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const runAt = new Date();

  const { data: settingsData, error } = await supabase
    .from("automation_settings")
    .select("business_id, daily_brief_enabled, daily_brief_time, timezone, daily_brief_channel, pause_until, autopilot_enabled")
    .or("daily_brief_enabled.eq.true,autopilot_enabled.eq.true");

  if (error) {
    return Response.json(
      { ok: false, error: "settings_query_failed", detail: error.message },
      { status: 500 }
    );
  }

  const settings = (settingsData ?? []) as AutomationSetting[];
  const businessIds = settings.map((setting) => setting.business_id);
  const businessesById = await loadBusinessesById(supabase, businessIds);
  const results: QueueResult[] = [];

  for (const setting of settings) {
    const business = businessesById.get(setting.business_id);
    if (!business) {
      results.push({ business_id: setting.business_id, queued: false, reason: "missing_business" });
      continue;
    }

    if (setting.pause_until && new Date(setting.pause_until).getTime() > runAt.getTime()) {
      results.push({ business_id: setting.business_id, queued: false, reason: "paused" });
      continue;
    }

    let syncCount = 0;
    if (setting.autopilot_enabled) {
      const syncResults = await syncActiveSourcesForBusiness(supabase, setting.business_id, { runType: "scheduled" });
      syncCount = syncResults.filter((result) => result.ok).length;
      await writeAudit(supabase, setting.business_id, "internal_autopilot_sync_completed", {
        ok: syncCount,
        checked: syncResults.length,
      });
    }

    if (!setting.daily_brief_enabled) {
      results.push({ business_id: setting.business_id, queued: false, reason: "synced_only", sync_count: syncCount });
      continue;
    }

    const local = localTimeParts(runAt, setting.timezone || "Africa/Johannesburg");
    if (!isWithinBriefWindow(local.minutesOfDay, setting.daily_brief_time)) {
      results.push({ business_id: setting.business_id, queued: false, reason: "not_due_now", sync_count: syncCount });
      continue;
    }

    const { data: existing } = await supabase
      .from("notification_queue")
      .select("id")
      .eq("business_id", setting.business_id)
      .contains("payload", { kind: "owner_daily_brief", brief_date: local.date })
      .limit(1);

    if ((existing ?? []).length > 0) {
      results.push({ business_id: setting.business_id, queued: false, reason: "already_queued", sync_count: syncCount });
      continue;
    }

    const { data: actionsData, error: actionsError } = await supabase
      .from("actions")
      .select("kind")
      .eq("business_id", setting.business_id)
      .eq("status", "open")
      .lte("due_date", local.date)
      .limit(100);

    if (actionsError) {
      await writeAudit(supabase, setting.business_id, "owner_daily_brief_queue_failed", {
        reason: "actions_query_failed",
        detail: actionsError.message,
      });
      results.push({ business_id: setting.business_id, queued: false, reason: "actions_query_failed", sync_count: syncCount });
      continue;
    }

    const actionRows = (actionsData ?? []) as ActionRow[];
    const actionCount = actionRows.length;
    const moneyCount = actionRows.filter((action) => MONEY_KINDS.has(action.kind)).length;
    const leadCount = actionRows.filter((action) => action.kind === "lead_response").length;

    const { subject, body } = briefCopy(business.name, actionCount, moneyCount, leadCount);

    const { error: insertError } = await supabase.from("notification_queue").insert({
      business_id: setting.business_id,
      channel: "in_app",
      recipient: business.owner_id,
      subject,
      body,
      payload: {
        kind: "owner_daily_brief",
        brief_date: local.date,
        preferred_channel: setting.daily_brief_channel,
        timezone: setting.timezone || "Africa/Johannesburg",
        action_count: actionCount,
        money_count: moneyCount,
        lead_count: leadCount,
        source_sync_count: syncCount,
      },
      status: "queued",
      scheduled_for: runAt.toISOString(),
      requires_approval: false,
      approved_at: runAt.toISOString(),
    });

    if (insertError) {
      await writeAudit(supabase, setting.business_id, "owner_daily_brief_queue_failed", {
        reason: "queue_insert_failed",
        detail: insertError.message,
        brief_date: local.date,
      });
      results.push({ business_id: setting.business_id, queued: false, reason: "queue_insert_failed", sync_count: syncCount });
      continue;
    }

    await writeAudit(supabase, setting.business_id, "owner_daily_brief_queued", {
      brief_date: local.date,
      action_count: actionCount,
      money_count: moneyCount,
      lead_count: leadCount,
      preferred_channel: setting.daily_brief_channel,
      source_sync_count: syncCount,
    });

    results.push({ business_id: setting.business_id, queued: true, reason: "queued", action_count: actionCount, sync_count: syncCount });
  }

  return Response.json({
    ok: true,
    run_at: runAt.toISOString(),
    checked: results.length,
    queued: results.filter((result) => result.queued).length,
    synced: results.reduce((sum, result) => sum + (result.sync_count ?? 0), 0),
    results,
  });
}

async function loadBusinessesById(
  supabase: AdminClient,
  businessIds: string[]
): Promise<Map<string, BusinessRow>> {
  if (businessIds.length === 0) return new Map();

  const { data } = await supabase
    .from("businesses")
    .select("id, name, owner_id")
    .in("id", businessIds);

  const rows = (data ?? []) as BusinessRow[];
  return new Map(rows.map((row) => [row.id, row]));
}

async function writeAudit(
  supabase: AdminClient,
  businessId: string,
  eventName: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await supabase.from("action_audit_log").insert({
    business_id: businessId,
    actor_type: "automation",
    event_name: eventName,
    metadata,
  });
}

function briefCopy(
  businessName: string,
  actionCount: number,
  moneyCount: number,
  leadCount: number
): { subject: string; body: string } {
  if (actionCount === 0) {
    return {
      subject: "DueToday: no actions due today",
      body: `${businessName} has no due actions today. Open DueToday to review your business momentum.`,
    };
  }

  return {
    subject: `DueToday: ${actionCount} action${actionCount === 1 ? "" : "s"} due today`,
    body: `${businessName} has ${actionCount} action${actionCount === 1 ? "" : "s"} due today. Money: ${moneyCount}. Leads: ${leadCount}. Open DueToday and clear the list.`,
  };
}

function isWithinBriefWindow(minutesOfDay: number, dailyBriefTime: string): boolean {
  const [hourRaw = "0", minuteRaw = "0"] = dailyBriefTime.slice(0, 5).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;

  const target = hour * 60 + minute;
  return minutesOfDay >= target && minutesOfDay < target + 60;
}

function localTimeParts(date: Date, timeZone: string): { date: string; minutesOfDay: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = Number(value("hour"));
  const minute = Number(value("minute"));

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutesOfDay: hour * 60 + minute,
  };
}
