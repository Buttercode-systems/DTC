import Link from "next/link";
import { requireBusiness } from "@/lib/db";
import { syncSourceNow, updateAutomationSettings } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automation — DueToday" };

type AutomationSettings = {
  daily_brief_enabled: boolean;
  daily_brief_time: string;
  timezone: string;
  daily_brief_channel: string;
  customer_message_mode: string;
  approved_send_enabled: boolean;
  autopilot_enabled: boolean;
  require_approval_for_customer_messages: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  max_customer_messages_per_day: number;
  pause_until: string | null;
};

type SourceConnection = {
  id: string;
  source_type: string;
  display_name: string;
  status: string;
  last_synced_at: string | null;
  last_error: string | null;
};

type SyncRun = {
  id: string;
  run_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  records_seen: number;
  records_created: number;
  records_updated: number;
  actions_created: number;
  error_message: string | null;
};

type QueueItem = {
  id: string;
  channel: string;
  recipient: string | null;
  subject: string | null;
  body: string;
  status: string;
  scheduled_for: string;
  requires_approval: boolean;
  approved_at: string | null;
  attempts: number;
  last_error: string | null;
};

type AuditItem = {
  id: string;
  event_name: string;
  actor_type: string;
  old_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const SOURCE_CARDS = [
  { type: "manual", title: "Manual", status: "live", detail: "Quick-add forms and Today actions." },
  { type: "csv", title: "CSV / paste", status: "live", detail: "Open quote and unpaid invoice import." },
  { type: "google_sheets", title: "Google Sheets", status: "live", detail: "Read selected rows and turn quotes/invoices into Today actions." },
  { type: "gmail", title: "Gmail", status: "live", detail: "Read matched emails and turn them into lead-response actions." },
  { type: "solobid", title: "SoloBid", status: "planned", detail: "Convert + Collect specialist adapter." },
  { type: "rentease", title: "RentEase", status: "planned", detail: "Rent, maintenance and control actions." },
  { type: "radflow", title: "RadFlow", status: "planned", detail: "Clinical workflow visibility actions." },
];

export default async function AutomationPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string; connected?: string; synced?: string };
}) {
  const { supabase, business } = await requireBusiness();

  const settingsResult = await supabase.rpc("get_or_create_automation_settings");
  const settings = settingsResult.data as AutomationSettings | null;
  const migrationMissing = Boolean(settingsResult.error);

  const [sources, syncRuns, queueItems, auditItems] = migrationMissing
    ? [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]
    : await Promise.all([
        supabase
          .from("source_connections")
          .select("id, source_type, display_name, status, last_synced_at, last_error")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("sync_runs")
          .select("id, run_type, status, started_at, finished_at, records_seen, records_created, records_updated, actions_created, error_message")
          .eq("business_id", business.id)
          .order("started_at", { ascending: false })
          .limit(10),
        supabase
          .from("notification_queue")
          .select("id, channel, recipient, subject, body, status, scheduled_for, requires_approval, approved_at, attempts, last_error")
          .eq("business_id", business.id)
          .order("scheduled_for", { ascending: false })
          .limit(10),
        supabase
          .from("action_audit_log")
          .select("id, event_name, actor_type, old_status, new_status, metadata, created_at")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

  const sourceRows = (sources.data ?? []) as SourceConnection[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow mb-2">Automation control</p>
          <h1 className="font-display text-3xl leading-tight">Sources + internal autopilot</h1>
          <p className="mt-2 text-sm leading-6 text-faint">
            Google Sheets and Gmail can now connect as live sources. Autopilot is internal-only: it may sync sources and create Today actions, but customer WhatsApp/email still requires approval.
          </p>
        </div>
        <Link href="/app/brief" className="btn-secondary !py-2 !px-4 text-sm">
          Daily brief →
        </Link>
      </div>

      {migrationMissing && (
        <div className="border border-stuck bg-card p-4 text-sm">
          <p className="font-semibold text-stuck">Automation migration not applied yet.</p>
          <p className="mt-1 text-faint">
            Apply <code>supabase/migrations/0005_production_automation_architecture.sql</code> and <code>0007_google_sources_internal_autopilot.sql</code> to enable sources and internal autopilot fully.
          </p>
        </div>
      )}

      <StatusMessages searchParams={searchParams} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Daily brief" value={settings?.daily_brief_enabled ? "On" : "Off"} />
        <Metric label="Customer mode" value={labelMode(settings?.customer_message_mode ?? "draft_only")} />
        <Metric label="Connected sources" value={sourceRows.filter((s) => s.status === "active").length} />
        <Metric label="Autopilot" value={settings?.autopilot_enabled ? "Internal" : "Off"} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="bg-card shadow-card p-5">
          <p className="eyebrow mb-2">Automation settings</p>
          <h2 className="font-display text-2xl">Owner controls</h2>
          <form action={updateAutomationSettings} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2 flex items-start gap-3 border border-rule p-3">
              <input type="checkbox" name="daily_brief_enabled" defaultChecked={settings?.daily_brief_enabled ?? false} className="mt-1" disabled={migrationMissing} />
              <span>
                <span className="block text-sm font-semibold">Enable owner daily brief</span>
                <span className="block text-xs text-faint">Creates the morning rhythm. This does not send customer messages.</span>
              </span>
            </label>

            <Field label="Brief time">
              <input name="daily_brief_time" type="time" className="field" defaultValue={trimTime(settings?.daily_brief_time ?? "07:30")} disabled={migrationMissing} />
            </Field>
            <Field label="Timezone">
              <input name="timezone" className="field" defaultValue={settings?.timezone ?? "Africa/Johannesburg"} disabled={migrationMissing} />
            </Field>
            <Field label="Brief channel">
              <select name="daily_brief_channel" className="field" defaultValue={settings?.daily_brief_channel ?? "email"} disabled={migrationMissing}>
                <option value="email">Email</option>
                <option value="in_app">In-app only</option>
              </select>
            </Field>
            <Field label="Customer message mode">
              <select name="customer_message_mode" className="field" defaultValue={settings?.customer_message_mode ?? "draft_only"} disabled={migrationMissing}>
                <option value="manual_only">Manual only</option>
                <option value="draft_only">Draft only</option>
                <option value="approved_send">Approved-send ready</option>
                <option value="autopilot_internal_only">Internal autopilot only</option>
              </select>
            </Field>
            <label className="sm:col-span-2 flex items-start gap-3 border border-rule p-3">
              <input type="checkbox" name="approved_send_enabled" defaultChecked={settings?.approved_send_enabled ?? false} className="mt-1" disabled={migrationMissing} />
              <span>
                <span className="block text-sm font-semibold">Allow approved-send queue later</span>
                <span className="block text-xs text-faint">Still requires owner approval. This is not customer autopilot.</span>
              </span>
            </label>
            <label className="sm:col-span-2 flex items-start gap-3 border border-rule p-3">
              <input type="checkbox" name="autopilot_enabled" defaultChecked={settings?.autopilot_enabled ?? false} className="mt-1" disabled={migrationMissing} />
              <span>
                <span className="block text-sm font-semibold">Enable internal autopilot</span>
                <span className="block text-xs text-faint">Runs source sync and Today-action creation. Customer messages stay blocked unless approved.</span>
              </span>
            </label>
            <Field label="Quiet hours start">
              <input name="quiet_hours_start" type="time" className="field" defaultValue={trimTime(settings?.quiet_hours_start ?? "18:00")} disabled={migrationMissing} />
            </Field>
            <Field label="Quiet hours end">
              <input name="quiet_hours_end" type="time" className="field" defaultValue={trimTime(settings?.quiet_hours_end ?? "07:00")} disabled={migrationMissing} />
            </Field>
            <Field label="Max customer messages/day">
              <input name="max_customer_messages_per_day" type="number" min="0" max="50" className="field" defaultValue={settings?.max_customer_messages_per_day ?? 10} disabled={migrationMissing} />
            </Field>
            <Field label="Pause until">
              <input name="pause_until" type="datetime-local" className="field" defaultValue={settings?.pause_until ? toLocalInput(settings.pause_until) : ""} disabled={migrationMissing} />
            </Field>

            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
              <p className="font-mono text-[11px] text-faint">
                Hard guardrail: internal autopilot cannot send customer WhatsApp/email.
              </p>
              <button className="btn-primary !py-2 text-sm disabled:opacity-40" disabled={migrationMissing}>Save settings</button>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="bg-ink text-paper p-5">
            <p className="eyebrow !text-paper/60 mb-2">Guardrail</p>
            <h2 className="font-display text-2xl">Autopilot is internal first</h2>
            <p className="mt-2 text-sm leading-6 text-paper/75">
              It may sync Gmail/Sheets, create records, run the engine and queue owner briefs. It may not send payment chases, WhatsApps or customer emails without approval.
            </p>
          </div>
          <div className="border border-rule bg-card p-4 text-sm text-faint">
            <p className="font-semibold text-ink">Required env</p>
            <p className="mt-2">Google sources need GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI and INTEGRATION_SECRET_KEY.</p>
          </div>
        </aside>
      </section>

      <section>
        <p className="eyebrow mb-3">Source connections</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SOURCE_CARDS.map((source) => {
            const connected = sourceRows.find((s) => s.source_type === source.type);
            return <SourceCard key={source.type} source={source} connected={connected} migrationMissing={migrationMissing} />;
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Notification queue preview" eyebrow="Queued work">
          <QueueList items={(queueItems.data ?? []) as QueueItem[]} />
        </Panel>
        <Panel title="Recent sync runs" eyebrow="Source history">
          <SyncList items={(syncRuns.data ?? []) as SyncRun[]} />
        </Panel>
      </section>

      <section>
        <Panel title="Action audit log" eyebrow="Read-only audit">
          <AuditList items={(auditItems.data ?? []) as AuditItem[]} />
        </Panel>
      </section>
    </div>
  );
}

function StatusMessages({ searchParams }: { searchParams: { saved?: string; error?: string; connected?: string; synced?: string } }) {
  if (searchParams.saved === "settings") return <Notice tone="ok" text="Automation settings saved. Customer approval remains required." />;
  if (searchParams.connected) return <Notice tone="ok" text={`${labelSource(searchParams.connected)} connected. Run a manual sync to test it.`} />;
  if (searchParams.synced) return <Notice tone="ok" text={`${labelSource(searchParams.synced)} synced. Open Today to inspect new actions.`} />;
  if (searchParams.error) return <Notice tone="bad" text={errorMessage(searchParams.error)} />;
  return null;
}

function SourceCard({ source, connected, migrationMissing }: { source: { type: string; title: string; status: string; detail: string }; connected?: SourceConnection; migrationMissing: boolean }) {
  return (
    <div className="bg-card border border-rule p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{source.title}</p>
          <p className="mt-1 text-sm text-faint">{source.detail}</p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint border border-rule px-1.5 py-0.5">
          {connected?.status ?? source.status}
        </span>
      </div>

      {connected && (
        <div className="mt-3 border-t border-rule pt-3 text-xs text-faint">
          <p>{connected.display_name}</p>
          <p>Last sync: {connected.last_synced_at ? new Date(connected.last_synced_at).toLocaleString() : "Never"}</p>
          {connected.last_error && <p className="mt-1 text-stuck">{connected.last_error}</p>}
          {(source.type === "google_sheets" || source.type === "gmail") && (
            <form action={syncSourceNow} className="mt-3">
              <input type="hidden" name="connection_id" value={connected.id} />
              <button className="btn-secondary !py-2 text-xs" disabled={migrationMissing}>Sync now</button>
            </form>
          )}
        </div>
      )}

      {!connected && source.type === "google_sheets" && <GoogleSheetsForm disabled={migrationMissing} />}
      {!connected && source.type === "gmail" && <GmailForm disabled={migrationMissing} />}
    </div>
  );
}

function GoogleSheetsForm({ disabled }: { disabled: boolean }) {
  return (
    <form method="GET" action="/api/integrations/google/start" className="mt-4 grid gap-2">
      <input type="hidden" name="source_type" value="google_sheets" />
      <input className="field text-xs" name="spreadsheet_id" placeholder="Google Sheet ID" disabled={disabled} />
      <input className="field text-xs" name="range" defaultValue="Sheet1!A:F" placeholder="Range e.g. Sheet1!A:F" disabled={disabled} />
      <select className="field text-xs" name="import_kind" defaultValue="quotes" disabled={disabled}>
        <option value="quotes">Rows are quotes</option>
        <option value="invoices">Rows are invoices</option>
      </select>
      <button className="btn-primary !py-2 text-xs" disabled={disabled}>Connect Google Sheets</button>
    </form>
  );
}

function GmailForm({ disabled }: { disabled: boolean }) {
  return (
    <form method="GET" action="/api/integrations/google/start" className="mt-4 grid gap-2">
      <input type="hidden" name="source_type" value="gmail" />
      <input className="field text-xs" name="gmail_query" defaultValue="newer_than:14d (inquiry OR enquiry OR quote OR invoice OR payment)" disabled={disabled} />
      <button className="btn-primary !py-2 text-xs" disabled={disabled}>Connect Gmail</button>
      <p className="text-[11px] text-faint">DTC reads matching messages and creates lead-response actions. It does not send email.</p>
    </form>
  );
}

function Notice({ tone, text }: { tone: "ok" | "bad"; text: string }) {
  return <div className={tone === "ok" ? "border border-ledger bg-ledger-tint p-4 text-sm font-semibold" : "border border-stuck bg-card p-4 text-sm text-stuck"}>{text}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-faint">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-rule p-4">
      <p className="font-display text-2xl leading-none">{value}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-faint">{label}</p>
    </div>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="bg-card shadow-card p-5">
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function QueueList({ items }: { items: QueueItem[] }) {
  if (items.length === 0) return <Empty text="Nothing is queued yet. This is correct until the brief or approved-send queue creates work." />;
  return (
    <ul className="ruled">
      {items.map((item) => (
        <li key={item.id} className="py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{item.subject ?? item.channel}</p>
            <span className="font-mono text-[10px] text-faint uppercase">{item.status}</span>
          </div>
          <p className="mt-1 text-faint line-clamp-2">{item.body}</p>
          <p className="mt-2 font-mono text-[11px] text-faint">
            {item.channel} · approval {item.requires_approval ? "required" : "not required"} · attempts {item.attempts}
          </p>
        </li>
      ))}
    </ul>
  );
}

function SyncList({ items }: { items: SyncRun[] }) {
  if (items.length === 0) return <Empty text="No sync runs yet. Connect Gmail or Sheets and run Sync now." />;
  return (
    <ul className="ruled">
      {items.map((run) => (
        <li key={run.id} className="py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{run.run_type}</p>
            <span className="font-mono text-[10px] text-faint uppercase">{run.status}</span>
          </div>
          <p className="mt-1 text-faint">
            Seen {run.records_seen} · Created {run.records_created} · Updated {run.records_updated} · Actions {run.actions_created}
          </p>
          {run.error_message && <p className="mt-1 text-xs text-stuck">{run.error_message}</p>}
          <p className="mt-2 font-mono text-[11px] text-faint">{new Date(run.started_at).toLocaleString()}</p>
        </li>
      ))}
    </ul>
  );
}

function AuditList({ items }: { items: AuditItem[] }) {
  if (items.length === 0) return <Empty text="No audit entries yet. Saving automation settings will create the first entry." />;
  return (
    <ul className="ruled">
      {items.map((item) => (
        <li key={item.id} className="py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">{item.event_name}</p>
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">{item.actor_type}</span>
          </div>
          {(item.old_status || item.new_status) && (
            <p className="mt-1 text-faint">{item.old_status ?? "—"} → {item.new_status ?? "—"}</p>
          )}
          <p className="mt-2 font-mono text-[11px] text-faint">{new Date(item.created_at).toLocaleString()}</p>
        </li>
      ))}
    </ul>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="border border-rule p-4 text-sm text-faint">{text}</p>;
}

function trimTime(value: string): string {
  return value.slice(0, 5);
}

function toLocalInput(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function labelMode(value: string): string {
  if (value === "manual_only") return "Manual";
  if (value === "approved_send") return "Approved";
  if (value === "autopilot_internal_only") return "Internal";
  return "Drafts";
}

function labelSource(value: string): string {
  if (value === "google_sheets") return "Google Sheets";
  if (value === "gmail") return "Gmail";
  return value;
}

function errorMessage(value: string): string {
  const map: Record<string, string> = {
    settings: "Settings could not be saved. Check that the automation migrations are applied.",
    google_env: "Google integration env is missing. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI and INTEGRATION_SECRET_KEY.",
    google_callback: "Google could not complete the connection. Try connecting again.",
    google_token: "Google did not return a usable token. Try reconnecting and approving access.",
    missing_sheet: "Add a Google Sheet ID before connecting Sheets.",
    service_role_missing: "SUPABASE_SERVICE_ROLE_KEY is required for server-side source sync.",
    bad_source: "Unknown source type.",
    connection_save: "Could not save the source connection.",
    business_mismatch: "Google connection did not match this business.",
    sync: "Sync failed.",
  };
  return map[value] ?? `Automation error: ${value}`;
}
