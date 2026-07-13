import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account — The Admin Department Client Portal" };

export default async function ManagedAccountPage() {
  const { business } = await requireBusiness();
  if (!business.managed_by_tad) redirect("/app/settings");

  return (
    <div className="max-w-3xl space-y-7">
      <section>
        <p className="eyebrow">Client Portal</p>
        <h1 className="mt-2 font-display text-4xl">Account and service access</h1>
        <p className="mt-3 max-w-2xl text-faint leading-7">
          This portal is the client-facing view of your managed service. The Admin Department operates the detailed workflow while your authorised people keep control of decisions.
        </p>
      </section>

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2">
        <div className="bg-card p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Business</p>
          <p className="mt-2 font-display text-2xl">{business.name}</p>
        </div>
        <div className="bg-card p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Service status</p>
          <p className="mt-2 font-display text-2xl capitalize">{business.service_status}</p>
        </div>
      </section>

      <section className="border border-rule bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl">What belongs in this portal</h2>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-faint sm:grid-cols-2">
          <li>Today actions requiring client attention</li>
          <li>Approvals and important decisions</li>
          <li>Workflow progress and blockers</li>
          <li>Weekly service reports</li>
        </ul>
      </section>

      <section className="border-l-4 border-ledger bg-ledger/5 p-5">
        <h2 className="font-display text-2xl">Need access or service changes?</h2>
        <p className="mt-2 text-faint leading-6">
          Contact The Admin Department before sharing records, adding users or changing the agreed workflow boundary.
        </p>
        <a href="mailto:buttercoder.dev@gmail.com" className="btn-primary mt-4">Contact TAD</a>
      </section>
    </div>
  );
}
