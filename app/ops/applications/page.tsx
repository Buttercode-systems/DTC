import Link from "next/link";
import { requireOperator } from "@/lib/operator";
import {
  confirmTadCommercialGate,
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
  submitted_at: string;
};

type Payload = {
  summary: Record<"new" | "reviewing" | "qualified" | "onboarding" | "converted", number>;
  applications: Application[];
};

const EMPTY: Payload = {
  summary: { new: 0, reviewing: 0, qualified: 0, onboarding: 0, converted: 0 },
  applications: [],
};

const LABELS: Record<string, string> = {
  invoice: "Invoice Admin",
  sales: "Sales Admin",
  client: "Client Admin",
  property: "Property Admin",
  practice: "Practice / Booking Admin",
  member: "Member Admin",
};

const STATUS = ["new", "reviewing", "qualified", "declined", "onboarding", "converted"];
const DECISIONS = ["pending", "accepted", "needs_scope", "declined"];
const PAYMENTS = ["not_requested", "pending", "paid", "waived", "refunded"];

export default async function ApplicationsPage() {
  const { supabase } = await requireOperator();
  const { data, error } = await supabase.rpc("list_tad_applications");
  if (error) throw new Error(`Could not load applications: ${error.message}`);
  const payload = (data ?? EMPTY) as Payload;

  return (
    <div className="space-y-8">
      <section className="border-b border-rule pb-7">
        <p className="eyebrow">Managed admin intake</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Applications</h1>
        <p className="mt-3 max-w-3xl leading-7 text-faint">
          Qualify the workflow, record the accepted scope, confirm payment or an authorised waiver, and only then create the private managed workspace.
        </p>
      </section>

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(payload.summary).map(([label, value]) => (
          <article key={label} className="bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-faint">{label}</p>
            <p className="mt-1 font-display text-3xl">{value}</p>
          </article>
        ))}
      </section>

      {payload.applications.length === 0 ? (
        <section className="border border-dashed border-rule bg-card p-8 text-center">
          <h2 className="font-display text-2xl">No applications yet</h2>
        </section>
      ) : (
        <section className="space-y-5">
          {payload.applications.map((application) => {
            const label = LABELS[application.department] ?? application.department;
            const gateReady =
              application.commercial_decision === "accepted" &&
              ["paid", "waived"].includes(application.payment_status) &&
              Boolean(application.scope_accepted_at);

            return (
              <article key={application.id} className="border border-rule bg-card p-5 sm:p-6">
                <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="badge">{label}</span>
                      <span className={`badge ${application.readiness_ready ? "badge-good" : "badge-warn"}`}>
                        {application.readiness_score}/10 readiness
                      </span>
                      <span className="badge">{application.status}</span>
                      <span className={`badge ${gateReady ? "badge-good" : "badge-warn"}`}>
                        {gateReady ? "Commercial gate complete" : "Commercial gate incomplete"}
                      </span>
                    </div>
                    <h2 className="mt-3 font-display text-2xl">{application.business_name}</h2>
                    <p className="mt-1 text-sm text-faint">
                      {application.contact_name} · <a className="text-ledger hover:underline" href={`mailto:${application.email}`}>{application.email}</a>
                    </p>
                    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                      <Fact label="Workflow records" value={String(application.active_records)} />
                      <Fact label="Current tools" value={application.current_tools || "Not supplied"} />
                      <Fact label="Main problem" value={application.follow_up_problem.replaceAll("_", " ")} />
                      <Fact label="Submitted" value={formatDate(application.submitted_at)} />
                    </dl>
                    <div className="mt-5 border-l-4 border-ledger bg-paper px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-faint">Required outcome</p>
                      <p className="mt-1 leading-6">{application.required_outcome}</p>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-rule pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                    <form action={updateTadApplication} className="space-y-3">
                      <input type="hidden" name="application_id" value={application.id} />
                      <Select label="Status" name="status" value={application.status} options={STATUS} />
                      <Select label="Commercial decision" name="commercial_decision" value={application.commercial_decision} options={DECISIONS} />
                      <label className="block text-xs font-semibold uppercase tracking-wider text-faint">
                        Qualification notes
                        <textarea name="qualification_notes" defaultValue={application.qualification_notes ?? ""} maxLength={2000} rows={3} className="field mt-1" />
                      </label>
                      <button className="btn-secondary w-full">Save review</button>
                    </form>

                    {application.commercial_decision === "accepted" && !application.managed_business_id && (
                      <form action={confirmTadCommercialGate} className="space-y-3 border-t border-rule pt-4">
                        <input type="hidden" name="application_id" value={application.id} />
                        <Select label="Payment status" name="payment_status" value={application.payment_status} options={PAYMENTS} />
                        <label className="block text-xs font-semibold uppercase tracking-wider text-faint">
                          Payment / waiver reference
                          <input name="payment_reference" defaultValue={application.payment_reference ?? ""} maxLength={200} className="field mt-1" placeholder="Invoice, receipt or approved waiver reference" />
                        </label>
                        <label className="flex items-start gap-2 text-sm">
                          <input type="checkbox" name="scope_accepted" defaultChecked={Boolean(application.scope_accepted_at)} className="mt-1" />
                          <span>The client accepted the written scope and operating boundaries.</span>
                        </label>
                        <button className="btn-secondary w-full">Confirm payment and scope</button>
                      </form>
                    )}

                    {application.managed_business_id ? (
                      <Link href={`/ops/client/${application.managed_business_id}`} className="btn-primary block w-full text-center">Open managed workspace</Link>
                    ) : application.status === "qualified" && gateReady ? (
                      <form action={startTadApplicationOnboarding}>
                        <input type="hidden" name="application_id" value={application.id} />
                        <button className="btn-primary w-full">Create {label} workspace</button>
                      </form>
                    ) : application.status === "qualified" ? (
                      <p className="border border-rule bg-paper p-3 text-xs leading-5 text-faint">
                        Workspace creation unlocks only after commercial acceptance, payment or an authorised waiver, and written scope acceptance.
                      </p>
                    ) : null}
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

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wider text-faint">{label}</dt><dd className="mt-1 break-words capitalize">{value}</dd></div>;
}

function Select({ label, name, value, options }: { label: string; name: string; value: string; options: readonly string[] }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-faint">
      {label}
      <select name={name} defaultValue={value} className="field mt-1">
        {options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
      </select>
    </label>
  );
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}
