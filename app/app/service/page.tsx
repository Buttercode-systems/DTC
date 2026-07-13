import Link from "next/link";
import { requireBusiness } from "@/lib/db";
import { ApprovalSection } from "@/components/service-desk/ApprovalSection";
import { ReportSection } from "@/components/service-desk/ReportSection";
import { SummaryCard } from "@/components/service-desk/Shared";
import type { Approval, ServiceReport } from "@/components/service-desk/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Approvals and Reports — The Admin Department" };

type Department = {
  department: string;
  name: string;
  active: boolean;
  delivery_mode: "self_service" | "managed";
  status: string;
  item_count: number;
  open_count: number;
  blocked_count: number;
  overdue_count: number;
};

type Center = {
  business: { delivery_mode: string };
  departments: Department[];
};

type Today = {
  summary: { due: number; overdue: number; blocked: number; approvals: number };
};

export default async function ServiceDeskPage() {
  const { supabase, business } = await requireBusiness();
  const [centerResult, todayResult, approvalsResult, reportsResult, manageResult] = await Promise.all([
    supabase.rpc("get_tad_department_center", { p_business_id: business.id }),
    supabase.rpc("get_tad_unified_today", { p_business_id: business.id }),
    supabase
      .from("service_approvals")
      .select("id, title, detail, amount, status, due_date, decision_note, decided_at, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("service_reports")
      .select("id, period_start, period_end, metrics, summary, status, client_response, client_response_note, client_responded_at, updated_at")
      .eq("business_id", business.id)
      .in("status", ["ready", "sent"])
      .order("period_end", { ascending: false })
      .limit(24),
    supabase.rpc("can_manage_business", { p_business_id: business.id }),
  ]);

  if (centerResult.error) throw new Error(`Could not load departments: ${centerResult.error.message}`);
  if (todayResult.error) throw new Error(`Could not load queue summary: ${todayResult.error.message}`);
  if (approvalsResult.error) throw new Error(`Could not load approvals: ${approvalsResult.error.message}`);
  if (reportsResult.error) throw new Error(`Could not load reports: ${reportsResult.error.message}`);
  if (manageResult.error) throw new Error(`Could not check decision access: ${manageResult.error.message}`);

  const center = centerResult.data as Center;
  const today = todayResult.data as Today;
  const approvals = (approvalsResult.data ?? []) as Approval[];
  const reports = (reportsResult.data ?? []) as ServiceReport[];
  const active = center.departments.filter((department) => department.active);
  const managed = active.filter((department) => department.delivery_mode === "managed");
  const selfService = active.filter((department) => department.delivery_mode === "self_service");

  return (
    <div className="space-y-10">
      <section className="grid gap-7 border-b border-rule pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">One control room</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl leading-[1.02] sm:text-6xl">
            Approvals and reports
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-faint">
            Review decisions, blockers and evidence across all six departments, whether your team runs the workflow or TAD manages it.
          </p>
        </div>
        <Link href="/app/departments" className="btn-primary">Manage departments</Link>
      </section>

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Decisions" value={approvals.filter((approval) => approval.status === "pending").length} note="Waiting for a manager" />
        <SummaryCard label="Due" value={today.summary?.due ?? 0} note="Across every active department" />
        <SummaryCard label="Blocked" value={today.summary?.blocked ?? 0} note="Needs information or authority" />
        <SummaryCard label="Overdue" value={today.summary?.overdue ?? 0} note="Past the next-action date" />
        <SummaryCard label="Self-service" value={selfService.length} note="Departments run by your team" />
        <SummaryCard label="Managed" value={managed.length} note="Departments assigned to TAD" />
      </section>

      <ApprovalSection approvals={approvals} canManage={manageResult.data === true} />

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Department progress</p>
          <h2 className="mt-1 font-display text-3xl">All active workflows</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((department) => (
            <article key={department.department} className="border border-rule bg-card p-5">
              <div className="flex flex-wrap gap-2">
                <span className="badge">{department.delivery_mode === "managed" ? "Managed by TAD" : "Self-service"}</span>
                <span className="badge">{department.status}</span>
              </div>
              <h3 className="mt-3 font-display text-2xl">{department.name}</h3>
              <div className="mt-4 grid grid-cols-4 gap-px border border-rule bg-rule text-center">
                <Metric label="Records" value={department.item_count} />
                <Metric label="Open" value={department.open_count} />
                <Metric label="Blocked" value={department.blocked_count} />
                <Metric label="Overdue" value={department.overdue_count} />
              </div>
              <Link href={`/app/departments/${department.department}`} className="btn-secondary mt-4 w-full text-center">Open workflow</Link>
            </article>
          ))}
        </div>
      </section>

      <ReportSection reports={reports} canManage={manageResult.data === true} />

      <section className="border-t border-rule pt-8">
        <div className="bg-ink p-6 text-paper sm:p-8">
          <p className="eyebrow !text-paper/60">Dual operating model</p>
          <h2 className="mt-2 font-display text-3xl">Run it yourself, assign it to TAD, or combine both.</h2>
          <p className="mt-3 max-w-3xl text-paper/75 leading-7">
            The workspace, records, approvals and reports remain in one place when a department changes between SaaS and Managed delivery.
          </p>
          <Link href="/app" className="btn-primary mt-5 !bg-paper !text-ink hover:!bg-white">Open unified Today</Link>
        </div>
      </section>
    </div>
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
