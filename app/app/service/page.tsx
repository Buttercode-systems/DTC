import Link from "next/link";
import { requireBusiness } from "@/lib/db";
import { money } from "@/lib/format";
import {
  decideClientApproval,
  respondToServiceReport,
} from "@/app/app/service/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Service Desk — DueToday" };

type Approval = {
  id: string;
  title: string;
  detail: string | null;
  amount: number | null;
  status: string;
  due_date: string | null;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
};

type AttentionItem = {
  id: string;
  reference: string;
  title: string;
  status: string;
  assigned_name: string | null;
  priority: number;
  next_action: string | null;
  due_date: string | null;
  blocked_reason: string | null;
  last_outcome_code: string | null;
  updated_at: string;
};

type ServiceReport = {
  id: string;
  period_start: string;
  period_end: string;
  metrics: Record<string, number>;
  summary: string | null;
  status: string;
  client_viewed_at: string | null;
  client_response: string | null;
  client_response_note: string | null;
  client_responded_at: string | null;
  updated_at: string;
};

type ServiceDesk = {
  business: {
    id: string;
    name: string;
    industry: string | null;
    managed_by_tad: boolean;
    service_status: string;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
  } | null;
  engagement: {
    id: string;
    department: string;
    service_level: string;
    status: string;
    start_date: string | null;
    next_review_date: string | null;
    template_key: string | null;
  } | null;
  summary: {
    pending_approvals: number;
    open_workflow_records: number;
    blocked_workflow_records: number;
    overdue_workflow_records: number;
    actions_due: number;
    reports_ready: number;
  };
  approvals: Approval[];
  workflow: {
    template_name: string;
    department: string;
    statuses: string[];
    closed_statuses: string[];
    data_warning: string | null;
    status_counts: Record<string, number>;
    attention_items: AttentionItem[];
  } | null;
  reports: ServiceReport[];
};

const EMPTY: ServiceDesk = {
  business: null,
  engagement: null,
  summary: {
    pending_approvals: 0,
    open_workflow_records: 0,
    blocked_workflow_records: 0,
    overdue_workflow_records: 0,
    actions_due: 0,
    reports_ready: 0,
  },
  approvals: [],
  workflow: null,
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

export default async function ServiceDeskPage() {
  const { supabase, business } = await requireBusiness();

  if (!business.managed_by_tad) {
    return (
      <section className="max-w-3xl">
        <p className="eyebrow">The Admin Department</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">This workspace is not under a managed service.</h1>
        <p className="mt-4 max-w-2xl text-faint leading-7">
          The Service Desk appears when The Admin Department is helping operate a workflow for this business. Your normal DueToday records and Today list remain available.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/app" className="btn-primary">Back to Today</Link>
          <a href="https://the-admin-department.vercel.app/admin-audit.html" className="btn-secondary">Start an Admin Audit</a>
        </div>
      </section>
    );
  }

  const { error: syncError } = await supabase.rpc("sync_service_workflow_actions", {
    p_business_id: business.id,
  });
  if (syncError) throw new Error(`Could not refresh managed workflow actions: ${syncError.message}`);

  const { data, error } = await supabase.rpc("get_client_service_desk", {
    p_business_id: business.id,
  });
  if (error) throw new Error(`Could not load the Service Desk: ${error.message}`);
  const desk = (data ?? EMPTY) as ServiceDesk;
  const pending = desk.approvals.filter((approval) => approval.status === "pending");

  return (
    <div className="space-y-10">
      <section className="grid gap-7 border-b border-rule pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">Managed by The Admin Department</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl leading-[1.02] sm:text-6xl">Your Service Desk</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-faint">
            See the decisions waiting for you, the records currently blocked, the workflow progress and the weekly evidence produced by the service.
          </p>
        </div>
        <div className="border border-rule bg-card px-4 py-3 text-sm">
          <p className="font-semibold">{DEPARTMENTS[desk.engagement?.department ?? ""] ?? "Managed workflow"}</p>
          <p className="mt-1 text-faint">{desk.engagement?.service_level ?? "service"} · {desk.engagement?.status ?? business.service_status}</p>
          {desk.engagement?.next_review_date && (
            <p className="mt-1 font-mono text-[11px] text-faint">Next review {desk.engagement.next_review_date}</p>
          )}
        </div>
      </section>

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Decisions waiting" value={desk.summary.pending_approvals} note="Only you or a manager can decide" />
        <SummaryCard label="Open workflow records" value={desk.summary.open_workflow_records} note="Still moving through the service" />
        <SummaryCard label="Blocked" value={desk.summary.blocked_workflow_records} note="Needs information or a decision" />
        <SummaryCard label="Overdue" value={desk.summary.overdue_workflow_records} note="Past the current next-action date" />
      </section>

      <section className="space-y-5">
        <div>
          <p className="eyebrow">Your decisions</p>
          <h2 className="mt-1 font-display text-3xl">Approvals waiting</h2>
          <p className="mt-2 max-w-3xl text-faint">
            TAD prepares the work and supporting context. Important financial, customer and supplier decisions remain human-approved.
          </p>
        </div>

        {pending.length === 0 ? (
          <EmptyState title="No decisions are waiting." detail="TAD will place approvals here when your input is required." />
        ) : (
          <div className="space-y-4">
            {pending.map((approval) => (
              <article key={approval.id} className="border border-rule bg-card p-5 shadow-card">
                <div className="grid gap-5 lg:grid-cols-[1fr_24rem] lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="eyebrow">Decision required</p>
                        <h3 className="mt-1 font-display text-2xl">{approval.title}</h3>
                      </div>
                      {approval.amount !== null && <span className="stamp text-base">{money(approval.amount)}</span>}
                    </div>
                    {approval.detail && <p className="mt-3 text-sm leading-6 text-faint">{approval.detail}</p>}
                    <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-faint">
                      {approval.due_date ? `Decision due ${approval.due_date}` : "No decision date set"}
                    </p>
                  </div>

                  <form action={decideClientApproval} className="grid gap-3 border border-rule bg-paper p-4">
                    <input type="hidden" name="approval_id" value={approval.id} />
                    <label className="text-sm font-semibold">
                      Decision note
                      <textarea name="decision_note" rows={3} className="field mt-1 resize-y" placeholder="Optional reason, limit or instruction" />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button name="decision" value="approved" className="btn-primary !px-3 !py-2 text-sm">Approve</button>
                      <button name="decision" value="rejected" className="btn-secondary !px-3 !py-2 text-sm">Reject</button>
                    </div>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5 border-t border-rule pt-8">
        <div>
          <p className="eyebrow">Workflow visibility</p>
          <h2 className="mt-1 font-display text-3xl">What is moving and what needs attention</h2>
        </div>

        {!desk.workflow ? (
          <EmptyState title="The managed workflow is being configured." detail="TAD will publish the workflow map after the department setup is installed." />
        ) : (
          <>
            {desk.workflow.data_warning && (
              <div className="border border-slowing/40 bg-slowing/10 px-4 py-3 text-sm">
                <strong>Protected workflow.</strong> {desk.workflow.data_warning}
              </div>
            )}

            <div className="flex gap-px overflow-x-auto border border-rule bg-rule [scrollbar-width:none]">
              {desk.workflow.statuses.map((status) => (
                <div key={status} className="min-w-36 flex-1 bg-card p-4">
                  <p className="text-xs font-semibold leading-5">{status}</p>
                  <p className="mt-2 font-display text-3xl">{desk.workflow?.status_counts[status] ?? 0}</p>
                </div>
              ))}
            </div>

            {desk.workflow.attention_items.length === 0 ? (
              <EmptyState title="No workflow record needs your attention." detail="The operator can continue running the queue without a client decision." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {desk.workflow.attention_items.map((item) => (
                  <article key={item.id} className={`border bg-card p-5 ${item.blocked_reason ? "border-stuck/50" : "border-rule"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="eyebrow">{item.reference} · P{item.priority}</p>
                        <h3 className="mt-1 font-display text-xl">{item.title}</h3>
                      </div>
                      <Status value={item.status} />
                    </div>
                    {item.blocked_reason && (
                      <p className="mt-4 border-l-2 border-stuck pl-3 text-sm"><strong>Blocked:</strong> {item.blocked_reason}</p>
                    )}
                    <dl className="mt-4 grid gap-3 border-t border-rule pt-4 text-sm sm:grid-cols-2">
                      <Metric label="Owner" value={item.assigned_name || "Not assigned"} />
                      <Metric label="Due" value={item.due_date || "No date"} />
                      <Metric label="Next action" value={item.next_action || "Not recorded"} />
                      <Metric label="Latest outcome" value={item.last_outcome_code || "None"} />
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="space-y-5 border-t border-rule pt-8">
        <div>
          <p className="eyebrow">Weekly proof</p>
          <h2 className="mt-1 font-display text-3xl">Service reports</h2>
          <p className="mt-2 max-w-3xl text-faint">
            Each report shows what was completed, what remains due and whether the workflow should continue, change or stop.
          </p>
        </div>

        {desk.reports.length === 0 ? (
          <EmptyState title="No weekly report is ready yet." detail="The first report appears after TAD runs the workflow and closes the review period." />
        ) : (
          <div className="space-y-5">
            {desk.reports.map((report, index) => (
              <article key={report.id} className="border border-rule bg-card p-5 shadow-card sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">{index === 0 ? "Latest report" : "Service report"}</p>
                    <h3 className="mt-1 font-display text-2xl">{report.period_start} to {report.period_end}</h3>
                    {report.summary && <p className="mt-3 max-w-3xl text-sm leading-6 text-faint">{report.summary}</p>}
                  </div>
                  <Status value={report.client_response ? `client: ${report.client_response}` : report.status} />
                </div>

                <div className="mt-5 grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(report.metrics).map(([key, value]) => (
                    <div key={key} className="bg-paper p-4">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-faint">{labelMetric(key)}</p>
                      <p className="mt-2 font-display text-2xl">{formatMetric(key, value)}</p>
                    </div>
                  ))}
                </div>

                {report.client_response ? (
                  <div className="mt-5 border-l-2 border-ledger pl-4 text-sm">
                    <p><strong>Your decision:</strong> {report.client_response}</p>
                    {report.client_response_note && <p className="mt-1 text-faint">{report.client_response_note}</p>}
                  </div>
                ) : (
                  <form action={respondToServiceReport} className="mt-5 grid gap-3 border border-rule bg-paper p-4">
                    <input type="hidden" name="report_id" value={report.id} />
                    <label className="text-sm font-semibold">
                      What should happen next?
                      <textarea name="response_note" rows={2} className="field mt-1 resize-y" placeholder="Optional changes, concerns or conditions" />
                    </label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <button name="response" value="continue" className="btn-primary !px-3 !py-2 text-sm">Continue</button>
                      <button name="response" value="change" className="btn-secondary !px-3 !py-2 text-sm">Change the workflow</button>
                      <button name="response" value="stop" className="btn-secondary !px-3 !py-2 text-sm">Stop</button>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-rule pt-8">
        <div className="bg-ink p-6 text-paper sm:p-8">
          <p className="eyebrow !text-paper/60">Operating boundary</p>
          <h2 className="mt-2 font-display text-3xl">TAD runs the workflow. You keep control of the decisions.</h2>
          <p className="mt-3 max-w-3xl text-paper/75 leading-7">
            The detailed operator workspace remains private to The Admin Department. Your Service Desk shows approvals, blockers, progress and reports without exposing unnecessary operational detail.
          </p>
          <Link href="/app" className="btn-primary mt-5 !bg-paper !text-ink hover:!bg-white">Open today’s actions</Link>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <article className="bg-card p-5">
      <p className="font-mono text-[11px] uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-2 font-display text-4xl">{value}</p>
      <p className="mt-2 text-sm text-faint">{note}</p>
    </article>
  );
}

function Status({ value }: { value: string }) {
  return (
    <span className="border border-rule px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-faint">
      {value.replaceAll("_", " ")}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border border-dashed border-rule bg-card/50 p-8 text-center">
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-faint">{detail}</p>
    </div>
  );
}

function labelMetric(key: string): string {
  return key.replaceAll("_", " ");
}

function formatMetric(key: string, value: number): string {
  return key.includes("value") ? money(value) : String(value);
}
