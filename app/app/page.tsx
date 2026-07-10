import { requireBusiness } from "@/lib/db";
import { runEngine } from "@/lib/engine";
import { isoDate, longDate } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { TodayList, type TodayAction } from "@/components/TodayList";
import { FirstTodaySetup } from "@/components/FirstTodaySetup";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today — DueToday" };

export default async function TodayPage() {
  const { supabase, business } = await requireBusiness();

  // The engine runs every time the day is opened: derive, escalate, reconcile.
  await runEngine(supabase, business.id, business.settings);
  await trackEvent(supabase, "app_opened", { businessId: business.id, path: "/app" });

  const todayIso = isoDate();
  const [{ data: open }, { data: doneToday }] = await Promise.all([
    supabase
      .from("actions")
      .select("id, kind, title, detail, priority, contact_phone, due_date, entity_id, entity_table")
      .eq("business_id", business.id)
      .eq("status", "open")
      .lte("due_date", todayIso)
      .order("priority", { ascending: false }),
    supabase
      .from("actions")
      .select("id, title")
      .eq("business_id", business.id)
      .eq("status", "done")
      .gte("completed_at", todayIso + "T00:00:00")
      .order("completed_at", { ascending: false }),
  ]);

  const actions = (open ?? []) as TodayAction[];
  const money = actions.filter((a) =>
    ["invoice_chase", "promise_check", "quote_followup", "quote_expired", "recurring_invoice"].includes(a.kind)
  ).length;
  const leads = actions.filter((a) => a.kind === "lead_response").length;
  const hasOpenActions = actions.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="stamp text-2xl md:text-3xl">Today</span>
          <p className="mt-3 font-mono text-xs text-faint">{longDate()}</p>
        </div>
        <p className="font-mono text-sm text-faint text-right">
          {actions.length} action{actions.length === 1 ? "" : "s"}
          {money > 0 && ` · ${money} about money`}
          {leads > 0 && ` · ${leads} lead${leads === 1 ? "" : "s"} waiting`}
        </p>
      </div>

      {!hasOpenActions && (
        <div className="mt-6">
          <FirstTodaySetup quoteFollowupDays={business.settings.quote_followup_days} />
        </div>
      )}

      <div className="mt-6">
        <TodayList actions={actions} doneToday={doneToday ?? []} showTrackingHint={!hasOpenActions} />
      </div>
    </div>
  );
}
