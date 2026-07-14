import Link from "next/link";
import { requireTadBusiness } from "@/lib/platform";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account — The Admin Department" };

type Center = {
  business: {
    delivery_mode: "self_service" | "managed" | "hybrid";
    onboarding_status: string;
    timezone: string;
    currency: string;
  };
  subscription: null | {
    plan_key: string;
    status: string;
    trial_ends_at: string | null;
    current_period_ends_at: string | null;
    cancel_at_period_end: boolean;
  };
  departments: Array<{ active: boolean; delivery_mode: string }>;
};

export default async function AccountPage() {
  const { supabase, business } = await requireTadBusiness();
  const { data, error } = await supabase.rpc("get_tad_department_center", {
    p_business_id: business.id,
  });
  if (error) throw new Error(`Could not load account: ${error.message}`);
  const center = data as Center;
  const active = center.departments.filter((department) => department.active);
  const managed = active.filter((department) => department.delivery_mode === "managed").length;

  return (
    <div className="max-w-4xl space-y-8">
      <section className="border-b border-rule pb-7">
        <p className="eyebrow">Workspace account</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">{business.name}</h1>
        <p className="mt-3 max-w-3xl text-faint leading-7">
          One account controls TAD SaaS and TAD Managed. Keep departments self-service, assign them to TAD, or use both modes in the same workspace.
        </p>
      </section>

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Workspace mode" value={center.business.delivery_mode.replace("_", " ")} />
        <Fact label="Active departments" value={String(active.length)} />
        <Fact label="Managed by TAD" value={String(managed)} />
        <Fact label="Onboarding" value={center.business.onboarding_status.replace("_", " ")} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="border border-rule bg-card p-5 sm:p-6">
          <p className="eyebrow">Subscription</p>
          <h2 className="mt-2 font-display text-2xl capitalize">
            {center.subscription?.plan_key ?? "No plan selected"}
          </h2>
          <p className="mt-2 text-sm text-faint capitalize">
            Status: {center.subscription?.status ?? "not active"}
          </p>
          {center.subscription?.trial_ends_at && (
            <p className="mt-1 text-sm text-faint">
              Trial ends {new Date(center.subscription.trial_ends_at).toLocaleDateString("en-ZA")}
            </p>
          )}
          <p className="mt-4 text-sm leading-6 text-faint">
            Billing provider checkout is intentionally not simulated. Subscription records and entitlement boundaries exist, but live payment activation must be connected to an approved provider and webhook credentials before charging customers.
          </p>
        </article>

        <article className="border border-rule bg-card p-5 sm:p-6">
          <p className="eyebrow">Workspace defaults</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-faint">Timezone</dt><dd className="font-semibold">{center.business.timezone}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-faint">Currency</dt><dd className="font-semibold">{center.business.currency}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-faint">Service status</dt><dd className="font-semibold capitalize">{business.service_status}</dd></div>
          </dl>
        </article>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/app/departments" className="btn-primary text-center">Manage departments</Link>
        <Link href="/app/team" className="btn-secondary text-center">Manage team</Link>
        <Link href="/app/settings" className="btn-secondary text-center">Workspace settings</Link>
      </section>

      <section className="border-l-4 border-ledger bg-ledger/5 p-5">
        <h2 className="font-display text-2xl">Need TAD to operate more departments?</h2>
        <p className="mt-2 text-faint leading-6">
          Change any department to Managed in the Departments centre. The records remain in the same workspace while responsibility moves to TAD.
        </p>
        <Link href="/app/departments" className="btn-primary mt-4">Choose managed departments</Link>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-2 font-display text-2xl capitalize">{value}</p>
    </div>
  );
}
