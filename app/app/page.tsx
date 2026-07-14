import Link from "next/link";
import { requireBusiness, type Business } from "@/lib/db";
import { runEngine } from "@/lib/engine";
import { isoDate, longDate } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { TodayList, type TodayAction } from "@/components/TodayList";
import { FirstTodaySetup } from "@/components/FirstTodaySetup";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { business } = await requireBusiness();
  return { title: business.platform_key === "tad" ? "Today — The Admin Department" : "Today — DueToday" };
}

type UnifiedItem = {
  id: string;
  engagement_id: string;
  department: string;
  reference: string;
  title: string;
  status: string;
  assigned_name: string | null;
  priority: number;
  next_action: string | null;
  due_date: string | null;
  blocked_reason: string | null;
  delivery_mode: "self_service" | "managed";
};

type UnifiedToday = {
  summary: {
    due: number;
    overdue: number;
    blocked: number;
    approvals: number;
  };
  items: UnifiedItem[];
};

const DEPARTMENT_LABELS: Record<string, string> = {
  invoice: "Invoice Admin",
  sales: "Sales Admin",
  client: "Client Admin",
  property: "Property Admin",
  practice: "Practice / Booking Admin",
  member: "Member Admin",
};

export default async function TodayPage() {
  const { supabase, business } = await requireBusiness();
  await trackEvent(supabase, "app_opened", { businessId: business.id, path: "/app" });

  return business.platform_key === "tad"
    ? <TadToday supabase={supabase} business={business} />
    : <DueTodayToday supabase={supabase} business={business} />;
}

async function DueTodayToday({ supabase, business }: { supabase: SupabaseClient; business: Business }) {
  await runEngine(supabase, business.id, business.settings);

  const todayIso = isoDate();
  const [openResult, doneResult] = await Promise.all([
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
  if (openResult.error) throw new Error(`Could not load today's actions: ${openResult.error.message}`);
  if (doneResult.error) throw new Error(`Could not load completed actions: ${doneResult.error.message}`);

  const actions = (openResult.data ?? []) as TodayAction[];
  const money = actions.filter((action) =>
    ["invoice_chase", "promise_check", "quote_followup", "quote_expired", "recurring_invoice"].includes(action.kind)
  ).length;
  const leads = actions.filter((action) => action.kind === "lead_response").length;
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
        <TodayList actions={actions} doneToday={doneResult.data ?? []} showTrackingHint={!hasOpenActions} />
      </div>
    </div>
  );
}

async function TadToday({ supabase, business }: { supabase: SupabaseClient; business: Business }) {
  const { data, error } = await supabase.rpc("get_tad_unified_today", {
    p_business_id: business.id,
  });
  if (error) throw new Error(`Could not load unified Today queue: ${error.message}`);
  const today = data as UnifiedToday;
  const items = today.items ?? [];

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-7">
        <div>
          <span className="stamp text-2xl md:text-3xl">Today</span>
          <p className="mt-3 font-mono text-xs text-faint">{longDate()}</p>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl">One queue across every department</h1>
          <p className="mt-3 max-w-3xl text-faint leading-7">
            Due work, blocked records and missing next actions from Invoice, Sales, Client, Property, Practice and Member Admin appear here together.
          </p>
        </div>
        <Link href="/app/departments" className="btn-primary">Manage departments</Link>
      </section>

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Due today" value={today.summary?.due ?? 0} />
        <Summary label="Overdue" value={today.summary?.overdue ?? 0} />
        <Summary label="Blocked" value={today.summary?.blocked ?? 0} />
        <Summary label="Approvals" value={today.summary?.approvals ?? 0} />
      </section>

      {items.length === 0 ? (
        <section className="border border-dashed border-rule bg-card p-8 text-center">
          <h2 className="font-display text-2xl">Your unified queue is clear</h2>
          <p className="mx-auto mt-2 max-w-2xl text-faint">
            Activate all six departments, then add or import the real backlog. Any record due, blocked or missing a next action will surface here automatically.
          </p>
          <Link href="/app/departments" className="btn-primary mt-5">Activate departments</Link>
        </section>
      ) : (
        <section className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className={`border bg-card p-5 ${item.blocked_reason ? "border-stuck/50" : "border-rule"}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge">{DEPARTMENT_LABELS[item.department] ?? item.department}</span>
                    <span className="badge">{item.delivery_mode === "managed" ? "Managed by TAD" : "Self-service"}</span>
                    <span className="badge">{item.status}</span>
                  </div>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-faint">{item.reference}</p>
                  <h2 className="mt-1 font-display text-2xl">{item.title}</h2>
                  <p className="mt-2 text-sm text-faint">
                    {item.assigned_name || "No owner"} · Due {item.due_date || "not set"} · Priority {item.priority}
                  </p>
                  {item.blocked_reason && <p className="mt-3 text-sm text-stuck"><strong>Blocked:</strong> {item.blocked_reason}</p>}
                  <p className="mt-3 text-sm"><strong>Next:</strong> {item.next_action || "Set the next action"}</p>
                </div>
                <Link href={`/app/departments/${item.department}`} className="btn-secondary shrink-0">Open department</Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <article className="bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
    </article>
  );
}
