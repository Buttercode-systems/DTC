import Link from "next/link";
import { requireBusiness } from "@/lib/db";
import {
  activateAllDepartments,
  activateDepartment,
  updateDepartmentMode,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Departments — The Admin Department" };

type Department = {
  department: string;
  name: string;
  template_key: string;
  template_version: number;
  active: boolean;
  engagement_id: string | null;
  delivery_mode: "self_service" | "managed";
  status: string;
  item_count: number;
  open_count: number;
  blocked_count: number;
  overdue_count: number;
};

type Center = {
  business: {
    id: string;
    name: string;
    delivery_mode: "self_service" | "managed" | "hybrid";
    onboarding_status: string;
    timezone: string;
    currency: string;
    managed_by_tad: boolean;
  };
  subscription: null | {
    plan_key: string;
    status: string;
    trial_ends_at: string | null;
    current_period_ends_at: string | null;
  };
  departments: Department[];
};

const descriptions: Record<string, string> = {
  invoice: "Supplier invoices, missing information, approvals, duplicates, filing and exceptions.",
  sales: "Enquiries, quote follow-ups, owners, next actions, outcomes and revenue visibility.",
  client: "Client onboarding, documents, payment gates, handovers and missing steps.",
  property: "Tenant requests, owner approvals, suppliers, scheduling and completion evidence.",
  practice: "Non-clinical bookings, confirmations, no-shows and front-desk administration.",
  member: "Onboarding, attendance risk, payment-status follow-up, churn and reactivation.",
};

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: { activated?: string };
}) {
  const { supabase, business } = await requireBusiness();
  const { data, error } = await supabase.rpc("get_tad_department_center", {
    p_business_id: business.id,
  });
  if (error) throw new Error(`Could not load department center: ${error.message}`);
  const center = data as Center;
  const active = center.departments.filter((department) => department.active);
  const selfService = active.filter((department) => department.delivery_mode === "self_service").length;
  const managed = active.filter((department) => department.delivery_mode === "managed").length;

  return (
    <div className="space-y-8">
      <section className="border-b border-rule pb-7">
        <p className="eyebrow">One platform · Six departments</p>
        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">Departments</h1>
            <p className="mt-3 max-w-3xl text-faint leading-7">
              Activate every admin department in one workspace. Run each department yourself, assign it to TAD, or combine both modes without moving your records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={activateAllDepartments}>
              <input type="hidden" name="delivery_mode" value="self_service" />
              <button className="btn-secondary">Activate all for SaaS</button>
            </form>
            <form action={activateAllDepartments}>
              <input type="hidden" name="delivery_mode" value="managed" />
              <button className="btn-primary">Activate all as Managed</button>
            </form>
          </div>
        </div>
      </section>

      {searchParams.activated === "all" && (
        <div className="border border-ledger/30 bg-ledger-tint p-4 text-sm">
          All six departments are active. Configure each department progressively while the unified Today queue remains available across the workspace.
        </div>
      )}

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-5">
        <Summary label="Active departments" value={active.length} />
        <Summary label="Self-service" value={selfService} />
        <Summary label="Managed by TAD" value={managed} />
        <Summary label="Workspace mode" value={center.business.delivery_mode.replace("_", " ")} text />
        <Summary label="Plan" value={center.subscription?.plan_key ?? "Not selected"} text />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {center.departments.map((department) => (
          <article key={department.department} className="border border-rule bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className={`badge ${department.active ? "badge-good" : ""}`}>
                    {department.active ? "Active" : "Available"}
                  </span>
                  {department.active && (
                    <span className="badge">
                      {department.delivery_mode === "managed" ? "Managed by TAD" : "Self-service"}
                    </span>
                  )}
                  <span className="badge">Template {department.template_version}</span>
                </div>
                <h2 className="mt-3 font-display text-2xl">{department.name}</h2>
                <p className="mt-2 text-sm leading-6 text-faint">
                  {descriptions[department.department]}
                </p>
              </div>
              {department.active && department.engagement_id && (
                <Link
                  href={`/app/departments/${department.department}`}
                  className="btn-secondary"
                >
                  Open department
                </Link>
              )}
            </div>

            <div className="mt-5 grid grid-cols-4 gap-px border border-rule bg-rule text-center">
              <Metric label="Records" value={department.item_count} />
              <Metric label="Open" value={department.open_count} />
              <Metric label="Blocked" value={department.blocked_count} />
              <Metric label="Overdue" value={department.overdue_count} />
            </div>

            {department.active ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <form action={updateDepartmentMode}>
                  <input type="hidden" name="department" value={department.department} />
                  <input type="hidden" name="delivery_mode" value="self_service" />
                  <input type="hidden" name="enabled" value="true" />
                  <button
                    className={department.delivery_mode === "self_service" ? "btn-primary w-full" : "btn-secondary w-full"}
                    disabled={department.delivery_mode === "self_service"}
                  >
                    Run it ourselves
                  </button>
                </form>
                <form action={updateDepartmentMode}>
                  <input type="hidden" name="department" value={department.department} />
                  <input type="hidden" name="delivery_mode" value="managed" />
                  <input type="hidden" name="enabled" value="true" />
                  <button
                    className={department.delivery_mode === "managed" ? "btn-primary w-full" : "btn-secondary w-full"}
                    disabled={department.delivery_mode === "managed"}
                  >
                    Assign to TAD
                  </button>
                </form>
                <form action={updateDepartmentMode} className="sm:col-span-2">
                  <input type="hidden" name="department" value={department.department} />
                  <input type="hidden" name="delivery_mode" value={department.delivery_mode} />
                  <input type="hidden" name="enabled" value="false" />
                  <button className="w-full border border-rule px-4 py-2 text-sm text-faint hover:text-ink">
                    Pause department
                  </button>
                </form>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <form action={activateDepartment}>
                  <input type="hidden" name="department" value={department.department} />
                  <input type="hidden" name="delivery_mode" value="self_service" />
                  <button className="btn-secondary w-full">Activate for SaaS</button>
                </form>
                <form action={activateDepartment}>
                  <input type="hidden" name="department" value={department.department} />
                  <input type="hidden" name="delivery_mode" value="managed" />
                  <button className="btn-primary w-full">Activate as Managed</button>
                </form>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}

function Summary({ label, value, text = false }: { label: string; value: number | string; text?: boolean }) {
  return (
    <article className="bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-faint">{label}</p>
      <p className={`mt-1 font-display ${text ? "text-xl capitalize" : "text-3xl"}`}>{value}</p>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-paper p-3">
      <strong className="block font-display text-xl">{value}</strong>
      <span className="text-[10px] uppercase tracking-wider text-faint">{label}</span>
    </div>
  );
}
