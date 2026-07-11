import Link from "next/link";
import { requireBusiness } from "@/lib/db";
import { ApprovalSection } from "@/components/service-desk/ApprovalSection";
import { ReportSection } from "@/components/service-desk/ReportSection";
import { SummaryCard } from "@/components/service-desk/Shared";
import { WorkflowSection } from "@/components/service-desk/WorkflowSection";
import type {
  Approval,
  AttentionItem,
  ServiceDesk,
  ServiceReport,
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

type WorkflowPayload = {
  engagement: {
    id: string;
    department: string;
    service_level: string;
    status: string;
    next_review_date: string | null;
  };
  template: {
    key: string;
    name: string;
    config: {
      statuses: string[];
      closed_statuses: string[];
      data_warning?: string;
    };
  };
  items: AttentionItem[];
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

  const today = johannesburgDate();
  const [workflowResult, approvalsResult, reportsResult, manageResult, actionsResult] = await Promise.all([
    supabase.rpc("get_service_workflow", { p_business_id: business.id }),
    supabase
      .from("service_approvals")
      .select("id, title, detail, amount, status, due_date, decision_note, decided_at, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("service_reports")
      .select("id, period_start, period_end, metrics, summary, status, client_response, client_response_note, client_responded_at, updated_at")
      .eq("business_id", business.id)
      .in("status", ["ready", "sent"])
      .order("period_end", { ascending: false })
      .limit(12),
    supabase.rpc("can_manage_business", { p_business_id: business.id }),
    supabase
      .from("actions")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "open")
      .lte("due_date", today),
  ]);

  if (workflowResult.error && !workflowResult.error.message.includes("service engagement not found")) {
    throw new Error(`Could not load the managed workflow: ${workflowResult.error.message}`);
  }
  if (approvalsResult.error) throw new Error(`Could not load approvals: ${approvalsResult.error.message}`);
  if (reportsResult.error) throw new Error(`Could not load service reports: ${reportsResult.error.message}`);
  if (manageResult.error) throw new Error(`Could not check decision access: ${manageResult.error.message}`);
  if (actionsResult.error) throw new Error(`Could not count Today actions: ${actionsResult.error.message}`);

  const payload = (workflowResult.data ?? null) as WorkflowPayload | null;
  const approvals = (approvalsResult.data ?? []) as Approval[];
  const reports = (reportsResult.data ?? []) as ServiceReport[];
  const statuses = payload?.template.config.statuses ?? [];
  const closed = new Set(payload?.template.config.closed_statuses ?? []);
  const openItems = (payload?.items ?? []).filter((item) => !closed.has(item.status));
  const blockedItems = openItems.filter((item) => Boolean(item.blocked_reason));
  const overdueItems = openItems.filter((item) => Boolean(item.due_date && item.due_date < today));
  const attentionItems = openItems
    .filter((item) =>
      Boolean(
        item.blocked_reason ||
        (item.due_date && item.due_date <= today) ||
        !item.assigned_name ||
        !item.next_action
      )
    )
    .sort((a, b) => b.priority - a.priority || String(a.due_date ?? "").localeCompare(String(b.due_date ?? "")))
    .slice(0, 40);
  const statusCounts = statuses.reduce<Record<string, number>>((counts, status) => {
    counts[status] = (payload?.items ?? []).filter((item) => item.status === status).length;
    return counts;
  }, {});

  const desk: ServiceDesk = {
    can_manage: manageResult.data === true,
    business: {
      id: business.id,
      name: business.name,
      industry: business.industry,
      managed_by_tad: business.managed_by_tad,
      service_status: business.service_status,
      primary_contact_name: null,
      primary_contact_email: null,
    },
    engagement: payload ? {
      id: payload.engagement.id,
      department: payload.engagement.department,
      service_level: payload.engagement.service_level,
      status: payload.engagement.status,
      start_date: null,
      next_review_date: payload.engagement.next_review_date,
      template_key: payload.template.key,
    } : null,
    summary: {
      pending_approvals: approvals.filter((approval) => approval.status === "pending").length,
      open_workflow_records: openItems.length,
      blocked_workflow_records: blockedItems.length,
      overdue_workflow_records: overdueItems.length,
      actions_due: actionsResult.count ?? 0,
      reports_ready: reports.length,
    },
    approvals,
    workflow: payload ? {
      template_name: payload.template.name,
      department: payload.engagement.department,
      statuses,
      closed_statuses: [...closed],
      data_warning: payload.template.config.data_warning ?? null,
      status_counts: statusCounts,
      attention_items: attentionItems,
    } : null,
    reports,
  };

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
