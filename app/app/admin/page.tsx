import { requireBusiness } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Soft Launch Admin — DueToday" };

type Dashboard = {
  generated_at?: string;
  counts?: Record<string, number>;
  funnel_7d?: Record<string, number>;
  recent_feedback?: Array<{
    id: string;
    created_at: string;
    kind: string;
    rating: number | null;
    page: string | null;
    message: string;
    email: string | null;
    status: string;
    business_name: string | null;
  }>;
  recent_events?: Array<{
    created_at: string;
    event_name: string;
    path: string | null;
    metadata: Record<string, unknown> | null;
    business_name: string | null;
  }>;
};

const COUNT_LABELS: Record<string, string> = {
  assessments: "Assessments",
  assessment_leads: "Report leads",
  businesses: "Businesses",
  leads: "Leads",
  quotes: "Quotes",
  invoices: "Invoices",
  actions_open: "Open actions",
  actions_done: "Done actions",
  feedback_open: "Open feedback",
  events_24h: "Events 24h",
};

const FUNNEL_ORDER = [
  "assessment_completed",
  "signup_started",
  "signup_created",
  "app_opened",
  "lead_created",
  "quote_created",
  "invoice_created",
  "action_completed",
  "feedback_submitted",
];

export default async function SoftLaunchAdminPage() {
  const { supabase } = await requireBusiness();
  const { data, error } = await supabase.rpc("get_soft_launch_dashboard");

  if (error) {
    return (
      <div className="max-w-2xl">
        <p className="eyebrow mb-2">Soft launch admin</p>
        <h1 className="font-display text-3xl">Admin access required</h1>
        <p className="mt-4 text-faint">
          This dashboard is restricted to emails listed in the Supabase `soft_launch_admins` table. If this is your account, add your confirmed login email there and reload this page.
        </p>
      </div>
    );
  }

  const dashboard = (data ?? {}) as Dashboard;
  const counts = dashboard.counts ?? {};
  const funnel = dashboard.funnel_7d ?? {};
  const recentFeedback = dashboard.recent_feedback ?? [];
  const recentEvents = dashboard.recent_events ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Soft launch admin</p>
          <h1 className="font-display text-3xl">Readiness dashboard</h1>
          <p className="mt-2 text-faint max-w-2xl">
            Use this to watch testers move through the funnel, see whether they create money actions, and read feedback without digging through Supabase.
          </p>
        </div>
        {dashboard.generated_at && (
          <p className="font-mono text-xs text-faint">Updated {new Date(dashboard.generated_at).toLocaleString()}</p>
        )}
      </div>

      <section>
        <p className="eyebrow mb-3">Counts</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(COUNT_LABELS).map(([key, label]) => (
            <div key={key} className="bg-card border border-rule p-4">
              <p className="font-mono text-xs text-faint">{label}</p>
              <p className="mt-2 font-display text-3xl">{counts[key] ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-3">Funnel events — 7 days</p>
          <div className="bg-card border border-rule p-4">
            <ul className="ruled">
              {FUNNEL_ORDER.map((event) => (
                <li key={event} className="py-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-faint">{event}</span>
                  <span className="font-display text-xl">{funnel[event] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-3">Recent events</p>
          <div className="bg-card border border-rule p-4 max-h-[420px] overflow-y-auto">
            {recentEvents.length === 0 ? (
              <p className="text-sm text-faint">No events yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentEvents.map((event, index) => (
                  <li key={`${event.created_at}-${index}`} className="border-b border-rule pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-sm">{event.event_name}</p>
                      <p className="font-mono text-[10px] text-faint">{new Date(event.created_at).toLocaleString()}</p>
                    </div>
                    <p className="mt-1 text-xs text-faint">
                      {event.business_name ?? "Public funnel"}{event.path ? ` · ${event.path}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section>
        <p className="eyebrow mb-3">Recent feedback</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {recentFeedback.length === 0 ? (
            <div className="bg-card border border-rule p-5 text-faint">No feedback yet.</div>
          ) : (
            recentFeedback.map((item) => (
              <article key={item.id} className="bg-card border border-rule p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">{item.business_name ?? "Unknown business"}</p>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-faint border border-rule px-1.5 py-0.5">
                    {item.kind}{item.rating ? ` · ${item.rating}/5` : ""}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed">{item.message}</p>
                <p className="mt-3 font-mono text-[11px] text-faint">
                  {item.page ?? "No page"} · {new Date(item.created_at).toLocaleString()}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
