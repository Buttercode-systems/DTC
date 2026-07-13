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

const PROBLEM_LABELS: Record<string, string> = {
  missed: "Follow-ups are missed",
  ownership: "Nobody clearly owns records",
  next_action: "Quotes have no next action",
  visibility: "Owner cannot see overdue work",
  reporting: "Reporting is manual or absent",
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

export default async function ApplicationsPage() {
  const { supabase } = await requireOperator();
  const { data, error } = await supabase.rpc("list_tad_applications");
  if (error) throw new Error(`Could not load applications: ${error.message}`);
  const payload = (data ?? EMPTY) as ApplicationPayload;

  return (
    <div className="space-y-8">
      <section className="grid gap-5 border-b border-rule pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">Sales Admin intake</p>
          <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
            Applications
          </h1>
          <p className="mt-3 max-w-3xl text-faint leading-7">
            Review qualification facts, record the commercial decision and create the private DueToday workspace only after the application is qualified.
          </p>
        </div>
        <a
          href="https://the-admin-department.vercel.app/sales-admin-service.html"
          className="btn-secondary"
        >
          Open public offer
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
            Submitted Sales Admin readiness forms will appear here. Customer lead and quote records never enter this public intake queue.
          </p>
        </section>
      ) : (
        <section className="space-y-5">
          {payload.applications.map((application) => (
            <article key={application.id} className="border border-rule bg-card p-5 sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${application.readiness_ready ? "badge-good" : "badge-warn"}`}>
                      {application.readiness_score}/10 readiness
                    </span>
                    <span className="badge">{application.status}</span>
                    <span className="badge">{application.commercial_decision}</span>
                  </div>
                  <h2 className="mt-3 font-display text-2xl">{application.business_name}</h2>
                  <p className="mt-1 text-sm text-faint">
                    {application.contact_name} · <a className="text-ledger hover:underline" href={`mailto:${application.email}`}>{application.email}</a>
                  </p>
                  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <Fact label="Active records" value={String(application.active_records)} />
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
                  </div>
                </div>

                <div className="w-full border-t border-rule pt-5 xl:w-[360px] xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
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
                  ) : application.status === "qualified" ? (
                    <form action={startTadApplicationOnboarding} className="mt-3">
                      <input type="hidden" name="application_id" value={application.id} />
                      <button className="btn-primary w-full">
                        Create Sales Admin workspace
                      </button>
                    </form>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-faint">
                      Mark the application qualified before creating a private managed workspace.
                    </p>
                  )}
                </div>
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
