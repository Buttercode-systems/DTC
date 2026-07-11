import Link from "next/link";
import { requireBusiness } from "@/lib/db";
import { ApprovalSection } from "@/components/service-desk/ApprovalSection";
import { ReportSection } from "@/components/service-desk/ReportSection";
import { SummaryCard } from "@/components/service-desk/Shared";
import { WorkflowSection } from "@/components/service-desk/WorkflowSection";
import {
  EMPTY_SERVICE_DESK,
  type ServiceDesk,
} from "@/components/service-desk/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Service Desk — DueToday" };

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
        <h1 className="mt-2 font-display text-4xl leading-tight">
          This workspace is not under a managed service.
        </h1>
        <p className="mt-4 max-w-2xl text-faint leading-7">
          The Service Desk appears when The Admin Department is helping operate a workflow for this business. Your normal DueToday records and Today list remain available.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/app" className="btn-primary">Back to Today</Link>
          <a href="https://the-admin-department.vercel.app/admin-audit.html" className="btn-secondary">
            Start an Admin Audit
          </a>
        </div>
      </section>
    );
  }

  const { data, error } = await supabase.rpc("get_client_service_desk", {
    p_business_id: business.id,
  });
  if (error) throw new Error(`Could not load the Service Desk: ${error.message}`);

  const desk = (data ?? EMPTY_SERVICE_DESK) as ServiceDesk;

  return (
    <div className="space-y-10">
      <section className="grid gap-7 border-b border-rule pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">Managed by The Admin Department</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl leading-[1.02] sm:text-6xl">
            Your Service Desk
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-faint">
            See the decisions waiting for you, the records currently blocked, the workflow progress and the weekly evidence produced by the service.
          </p>
        </div>
        <div className="border border-rule bg-card px-4 py-3 text-sm">
          <p className="font-semibold">
            {DEPARTMENTS[desk.engagement?.department ?? ""] ?? "Managed workflow"}
          </p>
          <p className="mt-1 text-faint">
            {desk.engagement?.service_level ?? "service"} · {desk.engagement?.status ?? business.service_status}
          </p>
          {desk.engagement?.next_review_date && (
            <p className="mt-1 font-mono text-[11px] text-faint">
              Next review {desk.engagement.next_review_date}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Decisions" value={desk.summary.pending_approvals} note="Waiting for an owner or manager" />
        <SummaryCard label="Today actions" value={desk.summary.actions_due} note="Due in the shared action queue" />
        <SummaryCard label="Open records" value={desk.summary.open_workflow_records} note="Still moving through the service" />
        <SummaryCard label="Blocked" value={desk.summary.blocked_workflow_records} note="Needs information or a decision" />
        <SummaryCard label="Overdue" value={desk.summary.overdue_workflow_records} note="Past the current next-action date" />
        <SummaryCard label="Reports" value={desk.summary.reports_ready} note="Weekly proof ready to review" />
      </section>

      <ApprovalSection approvals={desk.approvals} canManage={desk.can_manage} />
      <WorkflowSection workflow={desk.workflow} />
      <ReportSection reports={desk.reports} canManage={desk.can_manage} />

      <section className="border-t border-rule pt-8">
        <div className="bg-ink p-6 text-paper sm:p-8">
          <p className="eyebrow !text-paper/60">Operating boundary</p>
          <h2 className="mt-2 font-display text-3xl">
            TAD runs the workflow. You keep control of the decisions.
          </h2>
          <p className="mt-3 max-w-3xl text-paper/75 leading-7">
            The detailed operator workspace remains private to The Admin Department. Your Service Desk shows approvals, blockers, progress and reports without exposing unnecessary operational detail.
          </p>
          <Link href="/app" className="btn-primary mt-5 !bg-paper !text-ink hover:!bg-white">
            Open today’s actions
          </Link>
        </div>
      </section>
    </div>
  );
}
