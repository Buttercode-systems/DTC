import { requireOperator } from "@/lib/operator";
import { money } from "@/lib/format";
import {
  createManagedBusiness,
  decideServiceApproval,
  generateServiceReport,
  openManagedBusiness,
  recordOpsOutcome,
  requestServiceApproval,
} from "@/app/ops/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operations Console — The Admin Department" };

type Client = {
  id: string;
  name: string;
  industry: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  service_status: string;
  engagement_id: string | null;
  department: string | null;
  service_level: string | null;
  engagement_status: string | null;
  next_review_date: string | null;
  due_actions: number;
  pending_approvals: number;
};

type OpsAction = {
  id: string;
  business_id: string;
  business_name: string;
  kind: string;
  title: string;
  detail: string | null;
  priority: number;
  due_date: string;
  source: string;
};

type Approval = {
  id: string;
  business_id: string;
  business_name: string;
  title: string;
  detail: string | null;
  amount: number | null;
  status: string;
  due_date: string | null;
};

type Report = {
  id: string;
  business_id: string;
  business_name: string;
  period_start: string;
  period_end: string;
  status: string;
  metrics: Record<string, number>;
  summary: string | null;
};

type Dashboard = {
  summary: {
    clients: number;
    due_actions: number;
    pending_approvals: number;
    reports_due: number;
  };
  clients: Client[];
  actions: OpsAction[];
  approvals: Approval[];
  reports: Report[];
};

const EMPTY: Dashboard = {
  summary: { clients: 0, due_actions: 0, pending_approvals: 0, reports_due: 0 },
  clients: [],
  actions: [],
  approvals: [],
  reports: [],
};

const DEPARTMENTS: Record<string, string> = {
  invoice: "Invoice Admin",
  sales: "Sales Admin",
  client: "Client Admin",
  property: "Property Admin",
  practice: "Practice / Booking Admin",
  member: "Member Admin",
  core: "DueToday Core",
};

const SERVICES: Record<string, string> = {
  audit: "Audit",
  setup: "Setup",
  managed: "Managed Admin",
  support: "Monthly Support",
};

export default async function OperationsConsolePage() {
  const { supabase } = await requireOperator();
  const { data, error } = await supabase.rpc("get_tad_ops_dashboard");
  if (error) throw new Error(`Could not load TAD operations: ${error.message}`);
  const dashboard = (data ?? EMPTY) as Dashboard;
  const periodEnd = johannesburgDate();
  const periodStart = johannesburgDate(addDays(new Date(), -6));

  return (
    <div className="space-y-10">
      <section className="grid gap-7 border-b border-rule pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">Managed admin delivery</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl leading-[1.02] sm:text-6xl">
            Run every client from one control room.
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-faint">
            Onboard the business, open its DueToday workspace, record operational outcomes,
            move human approvals and produce the weekly proof that the service is working.
          </p>
        </div>
        <a
          href="https://the-admin-department.vercel.app/admin-audit.html"
          className="btn-secondary"
        >
          Open public Admin Audit
        </a>
      </section>

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Managed clients" value={dashboard.summary.clients} note="Active service workspaces" />
        <SummaryCard label="Due actions" value={dashboard.summary.due_actions} note="Needs operator attention" />
        <SummaryCard label="Approvals" value={dashboard.summary.pending_approvals} note="Waiting for a decision" />
        <SummaryCard label="Reviews due" value={dashboard.summary.reports_due} note="Weekly service reviews" />
      </section>

      <section id="clients" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Client portfolio</p>
            <h2 className="mt-1 font-display text-3xl">Managed workspaces</h2>
          </div>
          <details className="w-full border border-rule bg-card p-4 sm:w-auto sm:min-w-[24rem]">
            <summary className="cursor-pointer font-semibold text-ledger">+ Onboard a client</summary>
            <form action={createManagedBusiness} className="mt-4 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Business name" name="name" required />
                <Field label="Industry" name="industry" placeholder="Electrical contractor" />
                <Field label="Primary contact" name="contact_name" />
                <Field label="Contact email" name="contact_email" type="email" />
                <SelectField label="First department" name="department" options={DEPARTMENTS} />
                <SelectField label="Service level" name="service_level" options={SERVICES} defaultValue="setup" />
              </div>
              <button className="btn-primary justify-self-end" type="submit">Create managed workspace</button>
            </form>
          </details>
        </div>

        {dashboard.clients.length === 0 ? (
          <EmptyState title="No managed clients yet." detail="Onboard the first business to create its workspace, service engagement and initial workflow-mapping action." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {dashboard.clients.map((client) => (
              <article key={client.id} className="border border-rule bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">{DEPARTMENTS[client.department ?? ""] ?? "Admin workflow"}</p>
                    <h3 className="mt-1 font-display text-2xl">{client.name}</h3>
                    <p className="mt-1 text-sm text-faint">{client.industry || "Industry not recorded"}</p>
                  </div>
                  <Status value={client.engagement_status ?? client.service_status} />
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-rule pt-4 text-sm">
                  <Metric label="Service" value={SERVICES[client.service_level ?? ""] ?? "Not set"} />
                  <Metric label="Contact" value={client.primary_contact_name || client.primary_contact_email || "Not recorded"} />
                  <Metric label="Due actions" value={String(client.due_actions ?? 0)} />
                  <Metric label="Approvals" value={String(client.pending_approvals ?? 0)} />
                  <Metric label="Next review" value={client.next_review_date || "Not scheduled"} />
                  <Metric label="Workspace" value="TAD managed" />
                </dl>

                <div className="mt-5 flex flex-wrap gap-2">
                  <form action={openManagedBusiness}>
                    <input type="hidden" name="business_id" value={client.id} />
                    <button className="btn-primary !px-3 !py-2 text-sm">Open DueToday</button>
                  </form>
                  <form action={generateServiceReport}>
                    <input type="hidden" name="business_id" value={client.id} />
                    <input type="hidden" name="period_start" value={periodStart} />
                    <input type="hidden" name="period_end" value={periodEnd} />
                    <button className="btn-secondary !px-3 !py-2 text-sm">Generate report</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="actions" className="space-y-5 border-t border-rule pt-8">
        <div>
          <p className="eyebrow">Operator queue</p>
          <h2 className="mt-1 font-display text-3xl">Work due now</h2>
          <p className="mt-2 max-w-3xl text-faint">
            “Done” is not enough. Record what happened and add the next date when the workflow continues.
          </p>
        </div>
        {dashboard.actions.length === 0 ? (
          <EmptyState title="The operator queue is clear." detail="No managed-client action is currently due." />
        ) : (
          <div className="space-y-3">
            {dashboard.actions.map((action) => (
              <article key={action.id} className="border border-rule bg-card p-5">
                <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="eyebrow">{action.business_name}</p>
                        <h3 className="mt-1 font-display text-xl">{action.title}</h3>
                      </div>
                      <span className="border border-rule px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                        P{action.priority} · {action.kind}
                      </span>
                    </div>
                    {action.detail && <p className="mt-2 text-sm leading-6 text-faint">{action.detail}</p>}
                    <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-faint">
                      Due {action.due_date} · {action.source}
                    </p>
                  </div>
                  <form action={recordOpsOutcome} className="grid gap-2 border border-rule bg-paper p-3">
                    <input type="hidden" name="action_id" value={action.id} />
                    <select name="outcome_code" className="field !py-2 text-sm" defaultValue="contacted">
                      <option value="contacted">Contacted — awaiting answer</option>
                      <option value="no_answer">No answer</option>
                      <option value="follow_up">Follow up again</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="paid">Paid</option>
                      <option value="approved">Approved</option>
                      <option value="completed">Completed</option>
                      <option value="not_needed">Not needed</option>
                      <option value="other">Other</option>
                    </select>
                    <textarea name="outcome_note" className="field resize-y !py-2 text-sm" rows={2} placeholder="What happened?" />
                    <div className="flex gap-2">
                      <input name="next_action_date" type="date" className="field !py-2 text-sm" />
                      <button className="btn-primary !px-3 !py-2 text-sm">Save</button>
                    </div>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="approvals" className="space-y-5 border-t border-rule pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Human control</p>
            <h2 className="mt-1 font-display text-3xl">Approvals waiting</h2>
          </div>
          <details className="w-full border border-rule bg-card p-4 sm:w-auto sm:min-w-[24rem]">
            <summary className="cursor-pointer font-semibold text-ledger">+ Request a decision</summary>
            <form action={requestServiceApproval} className="mt-4 grid gap-3">
              <label className="text-sm font-semibold">Client
                <select name="business_id" className="field mt-1" required>
                  {dashboard.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </label>
              <Field label="Decision title" name="title" required />
              <label className="text-sm font-semibold">Supporting detail
                <textarea name="detail" className="field mt-1 resize-y" rows={3} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Amount" name="amount" type="number" />
                <Field label="Decision due" name="due_date" type="date" />
              </div>
              <button className="btn-primary justify-self-end">Add approval request</button>
            </form>
          </details>
        </div>

        {dashboard.approvals.length === 0 ? (
          <EmptyState title="No approvals are waiting." detail="Client decisions appear here with the supporting detail, amount and due date." />
        ) : (
          <div className="space-y-3">
            {dashboard.approvals.map((approval) => (
              <article key={approval.id} className="grid gap-5 border border-rule bg-card p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="eyebrow">{approval.business_name}</p>
                  <h3 className="mt-1 font-display text-xl">{approval.title}</h3>
                  {approval.detail && <p className="mt-2 text-sm text-faint">{approval.detail}</p>}
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-faint">
                    {approval.amount ? money(approval.amount) : "No amount"} · Due {approval.due_date || "not set"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={decideServiceApproval}>
                    <input type="hidden" name="approval_id" value={approval.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <button className="btn-primary !px-3 !py-2 text-sm">Approve</button>
                  </form>
                  <form action={decideServiceApproval}>
                    <input type="hidden" name="approval_id" value={approval.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button className="btn-secondary !px-3 !py-2 text-sm">Reject</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="reports" className="space-y-5 border-t border-rule pt-8">
        <div>
          <p className="eyebrow">Proof of value</p>
          <h2 className="mt-1 font-display text-3xl">Weekly service reports</h2>
        </div>
        {dashboard.reports.length === 0 ? (
          <EmptyState title="No weekly reports yet." detail="Generate one from a client card after DueToday activity has been captured." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {dashboard.reports.map((report) => (
              <article key={report.id} className="border border-rule bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">{report.period_start} — {report.period_end}</p>
                    <h3 className="mt-1 font-display text-2xl">{report.business_name}</h3>
                  </div>
                  <Status value={report.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-faint">{report.summary || "Report ready for review."}</p>
                <div className="mt-4 grid grid-cols-2 gap-px border border-rule bg-rule text-sm">
                  <ReportMetric label="Completed" value={report.metrics.actions_completed ?? 0} />
                  <ReportMetric label="Still due" value={report.metrics.actions_due_now ?? 0} />
                  <ReportMetric label="Open quotes" value={`${report.metrics.open_quotes ?? 0} · ${money(report.metrics.open_quote_value ?? 0)}`} />
                  <ReportMetric label="Overdue" value={`${report.metrics.overdue_invoices ?? 0} · ${money(report.metrics.overdue_value ?? 0)}`} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: number; note: string }) {
  return <article className="bg-card p-5"><p className="eyebrow">{label}</p><strong className="mt-2 block font-display text-4xl">{value}</strong><p className="mt-2 text-sm text-faint">{note}</p></article>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>;
}

function Status({ value }: { value: string }) {
  return <span className="border border-ledger/40 bg-ledger/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ledger">{value}</span>;
}

function Field({ label, name, type = "text", required = false, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="text-sm font-semibold">{label}<input className="field mt-1" name={name} type={type} required={required} placeholder={placeholder} /></label>;
}

function SelectField({ label, name, options, defaultValue }: { label: string; name: string; options: Record<string, string>; defaultValue?: string }) {
  return <label className="text-sm font-semibold">{label}<select className="field mt-1" name={name} defaultValue={defaultValue}>{Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="border border-dashed border-rule bg-card/40 p-8 text-center"><h3 className="font-display text-2xl">{title}</h3><p className="mx-auto mt-2 max-w-xl text-sm text-faint">{detail}</p></div>;
}

function ReportMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="bg-paper p-3"><span className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</span><strong className="mt-1 block">{value}</strong></div>;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function johannesburgDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
