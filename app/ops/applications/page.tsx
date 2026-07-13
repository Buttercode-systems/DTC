import Link from "next/link";
import { requireOperator } from "@/lib/operator";
import {
  startTadApplicationOnboarding,
  updateTadApplication,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Applications — The Admin Department" };

type Application = {
  id: string;
  department: string;
  business_name: string;
  contact_name: string;
  email: string;
  active_records: number;
  follow_up_problem: string;
  current_tools: string | null;
  required_outcome: string;
  owner_available: boolean;
  data_authority: boolean;
  boundary_accepted: boolean;
  readiness_score: number;
  readiness_ready: boolean;
  status: string;
  qualification_notes: string | null;
  commercial_decision: string;
  payment_status: string;
  payment_reference: string | null;
  payment_confirmed_at: string | null;
  scope_accepted_at: string | null;
  managed_business_id: string | null;
  managed_business_name: string | null;
  source: string;
  submitted_at: string;
  updated_at: string;
};

type ApplicationPayload = {
  summary: {
    new: number;
    reviewing: number;
    qualified: number;
    onboarding: number;
    converted: number;
  };
  applications: Application[];
};

const EMPTY: ApplicationPayload = {
  summary: { new: 0, reviewing: 0, qualified: 0, onboarding: 0, converted: 0 },
  applications: [],
};

const DEPARTMENT_LABELS: Record<string, string> = {
  invoice: "Invoice Admin",
  sales: "Sales Admin",
  client: "Client Admin",
  property: "Property Admin",
  practice: "Practice / Booking Admin",
  member: "Member Admin",
};

const OFFER_PATHS: Record<string, string> = {
  invoice: "invoice-admin-service.html",
  sales: "sales-admin-service.html",
  client: "client-admin-service.html",
  property: "property-admin-service.html",
  practice: "practice-admin-service.html",
  member: "member-admin-service.html",
};

const PROBLEM_LABELS: Record<string, string> = {
  missed: "Follow-ups are missed",
  ownership: "Nobody clearly owns records",
  next_action: "Records have no next action",
  visibility: "Owner cannot see overdue work",
  reporting: "Reporting is manual or absent",
  missing_information: "Information arrives incomplete",
  approval_delay: "Approvals delay the workflow",
  duplicates: "Duplicate records or processing",
  filing: "Evidence and documents are hard to find",
  missing_documents: "Required documents are missing",
  onboarding_delay: "Onboarding takes too long",
  handover: "Internal handovers are incomplete",
  lost_requests: "Requests disappear across channels",
  supplier_delay: "Supplier quotes or updates are delayed",
  scheduling: "Scheduling and progress updates are inconsistent",
  completion_proof: "Completion evidence is missing",
  booking_gaps: "Bookings are missed or duplicated",
  confirmation_gaps: "Confirmations are inconsistent",
  no_show_followup: "No-show follow-up is inconsistent",
  attendance_risk: "Attendance risk is not followed up",
  payment_followup: "Payment follow-up is inconsistent",
  churn_risk: "At-risk members are not visible",
  reactivation: "Reactivation has no dated queue",
  none: "No repeated problem",
};

const STATUS_OPTIONS = [
  ["new", "New"],
  ["reviewing", "Reviewing"],
  ["qualified", "Qualified"],
  ["declined", "Declined"],
  ["onboarding", "Onboarding"],
  ["converted", "Converted"],
] as const;

const DECISION_OPTIONS = [
  ["pending", "Pending"],
  ["accepted", "Accepted"],
  ["needs_scope", "Needs separate scope"],
  ["declined", "Declined"],
] as const;

const PAYMENT_OPTIONS = [
  ["not_requested", "Not requested"],
  ["pending", "Pending"],
  ["paid", "Paid"],
  ["waived", "Waived / internal pilot"],
  ["refunded", "Refunded"],
] as const;

export default async function ApplicationsPage() {
  const { supabase } = await requireOperator();
  const { data, error } = await supabase.rpc("list_tad_applications");
  if (error) throw new Error(`Could not load applications: ${error.message}`);
  const payload = (data ?? EMPTY) as ApplicationPayload;

  return (
    <div className="space-y-8">
      <section className="grid gap-5 border-b border-rule pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">Managed admin intake</p>
          <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
            Applications
          </h1>
          <p className="mt-3 max-w-3xl text-faint leading-7">
            Review qualification facts and record the commercial decision. A private TAD managed workspace can only be created after the scope is accepted and setup payment is marked paid or waived.
          </p>
        </div>
        <a
          href="https://the-admin-department.vercel.app/#departments"
          className="btn-secondary"
        >
          Open public offers
        </a>
      </section>

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-5">
        <Summary label="New" value={payload.summary.new} />
        <Summary label="Reviewing" value={payload.summary.reviewing} />
        <Summary label="Qualified" value={payload.summary.qualified} />
        <Summary label="Onboarding" value={payload.summary.onboarding} />
        <Summary label="Converted" value={payload.summary.converted} />
      </section>

      {payload.applications.length === 0 ? (
        <section className="border border-dashed border-rule bg-card p-8 text-center">
          <h2 className="font-display text-2xl">No applications yet</h2>
          <p className="mt-2 text-faint">
            Submitted department readiness forms will appear here. Operational records never enter this public intake queue.
          </p>
        </section>
      ) : (
        <section className="space-y-5">
          {payload.applications.map((application) => {
            const departmentLabel =
              DEPARTMENT_LABELS[application.department] ?? application.department;
            const offerPath =
              OFFER_PATHS[application.department] ?? "admin-systems.html";
            const paymentReady = ["paid", "waived"].includes(application.payment_status);
            const scopeReady = Boolean(application.scope_accepted_at);
            const commerciallyReady =
              application.status === "qualified" &&
              application.commercial_decision === "accepted" &&
              paymentReady &&
              scopeReady;

            return (
              <article key={application.id} className="border border-rule bg-card p-5 sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge">{departmentLabel}</span>
                      <span className={`badge ${application.readiness_ready ? "badge-good" : "badge-warn"}`}>
                        {application.readiness_score}/10 readiness
                      </span>
                      <span className="badge">{application.status}</span>
                      <span className="badge">Offer {application.commercial_decision}</span>
                      <span className={`badge ${paymentReady ? "badge-good" : "badge-warn"}`}>
                        Payment {application.payment_status.replaceAll("_", " ")}
                      </span>
                      <span className={`badge ${scopeReady ? "badge-good" : "badge-warn"}`}>
                        Scope {scopeReady ? "accepted" : "pending"}
                      </span>
                    </div>
                    <h2 className="mt-3 font-display text-2xl">{application.business_name}</h2>
                    <p className="mt-1 text-sm text-faint">
                      {application.contact_name} · <a className="text-ledger hover:underline" href={`mailto:${application.email}`}>{application.email}</a>
                    </p>
                    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <Fact label="Workflow records" value={String(application.active_records)} />
                      <Fact label="Primary problem" value={PROBLEM_LABELS[application.follow_up_problem] ?? application.follow_up_problem} />
                      <Fact label="Current tools" value={application.current_tools || "Not supplied"} />
                      <Fact label="Submitted" value={formatDate(application.submitted_at)} />
                    </dl>
                    <div className="mt-5 border-l-4 border-ledger bg-paper px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-faint">Required outcome</p>
                      <p className="mt-1 leading-6">{application.required_outcome}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-faint">
                      <span>Owner available: {application.owner_available ? "Yes" : "No"}</span>
                      <span>·</span>
                      <span>Data authority: {application.data_authority ? "Confirmed" : "Missing"}</span>
                      <span>·</span>
                      <span>Boundary: {application.boundary_accepted ? "Accepted" : "Missing"}</span>
                      <span>·</span>
                      <a
                        href={`https://the-admin-department.vercel.app/${offerPath}`}
                        className="text-ledger hover:underline"
                      >
                        Open offer
                      </a>
                    </div>
                  </div>

                  <div className="w-full border-t border-rule pt-5 xl:w-[380px] xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                    <form action={updateTadApplication} className="space-y-3">
                      <input type="hidden" name="application_id" value={application.id} />
                      <label className="block text-xs font-semibold uppercase tracking-wider text-faint">
                        Status
                        <select name="status" defaultValue={application.status} className="field mt-1">
                          {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-faint">
                        Commercial decision
                        <select name="commercial_decision" defaultValue={application.commercial_decision} className="field mt-1">
                          {DECISION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-faint">
                        Setup payment
                        <select name="payment_status" defaultValue={application.payment_status} className="field mt-1">
                          {PAYMENT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-faint">
                        Payment reference
                        <input
                          name="payment_reference"
                          defaultValue={application.payment_reference ?? ""}
                          maxLength={200}
                          className="field mt-1"
                          placeholder="Invoice, EFT or waiver reference"
                        />
                      </label>
                      <label className="flex items-start gap-3 border border-rule bg-paper p-3 text-sm">
                        <input
                          type="checkbox"
                          name="scope_accepted"
                          defaultChecked={scopeReady}
                          className="mt-1"
                        />
                        <span>
                          <strong className="block">Scope accepted</strong>
                          <span className="text-faint">The client accepted the department, price, operating boundary and starting-record limit.</span>
                        </span>
                      </label>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-faint">
                        Qualification notes
                        <textarea
                          name="qualification_notes"
                          defaultValue={application.qualification_notes ?? ""}
                          maxLength={2000}
                          rows={4}
                          className="field mt-1"
                          placeholder="Evidence, objections, next conversation and scope conditions"
                        />
                      </label>
                      <button className="btn-secondary w-full">Save review</button>
                    </form>

                    {application.managed_business_id ? (
                      <Link
                        href={`/ops/client/${application.managed_business_id}`}
                        className="btn-primary mt-3 w-full text-center"
                      >
                        Open managed workspace
                      </Link>
                    ) : commerciallyReady ? (
                      <form action={startTadApplicationOnboarding} className="mt-3">
                        <input type="hidden" name="application_id" value={application.id} />
                        <button className="btn-primary w-full">
                          Create {departmentLabel} workspace
                        </button>
                      </form>
                    ) : (
                      <div className="mt-3 border border-slowing/40 bg-slowing/10 p-3 text-xs leading-5">
                        <strong className="block">Workspace locked until all gates pass:</strong>
                        <span className="block">{application.status === "qualified" ? "✓" : "○"} Application qualified</span>
                        <span className="block">{application.commercial_decision === "accepted" ? "✓" : "○"} Offer accepted</span>
                        <span className="block">{paymentReady ? "✓" : "○"} Setup payment paid or waived</span>
                        <span className="block">{scopeReady ? "✓" : "○"} Scope accepted</span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-1 break-words leading-5">{value}</dd>
    </div>
  );
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-ZA", {
      timeZone: "Africa/Johannesburg",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
