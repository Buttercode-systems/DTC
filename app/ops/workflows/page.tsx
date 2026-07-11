import Link from "next/link";
import { requireOperator } from "@/lib/operator";
import {
  createWorkflowItem,
  updateWorkflowItem,
} from "@/app/ops/workflows/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Managed Workflows — The Admin Department" };

type TemplateField = {
  key: string;
  label: string;
  type: "text" | "number" | "url" | "select";
  required?: boolean;
  options?: string[];
};

type WorkflowItem = {
  id: string;
  reference: string;
  title: string;
  status: string;
  assigned_name: string | null;
  priority: number;
  next_action: string | null;
  due_date: string | null;
  blocked_reason: string | null;
  data: Record<string, string | number | null>;
  last_outcome_code: string | null;
  last_outcome_note: string | null;
  completed_at: string | null;
  updated_at: string;
};

type Workflow = {
  business: { id: string; name: string; industry: string | null; service_status: string };
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
    version: number;
    config: {
      statuses: string[];
      closed_statuses: string[];
      fields: TemplateField[];
    };
  };
  items: WorkflowItem[];
};

type Client = { id: string; name: string; department: string | null; service_status: string };

type Dashboard = { clients?: Client[] };

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: { business?: string };
}) {
  const { supabase } = await requireOperator();
  const { data: dashboardData, error: dashboardError } = await supabase.rpc(
    "get_tad_ops_dashboard"
  );
  if (dashboardError) {
    throw new Error(`Could not load managed clients: ${dashboardError.message}`);
  }

  const clients = ((dashboardData ?? {}) as Dashboard).clients ?? [];
  const selectedId = clients.some((client) => client.id === searchParams.business)
    ? searchParams.business!
    : clients[0]?.id;

  if (!selectedId) {
    return (
      <section className="max-w-3xl border border-rule bg-card p-8 shadow-card">
        <p className="eyebrow">Managed workflows</p>
        <h1 className="mt-2 font-display text-4xl">Onboard a client first</h1>
        <p className="mt-4 text-faint">
          A configurable workflow is installed when a managed client workspace and
          service engagement exist.
        </p>
        <Link href="/ops#clients" className="btn-primary mt-6">
          Go to client onboarding
        </Link>
      </section>
    );
  }

  const { data, error } = await supabase.rpc("get_service_workflow", {
    p_business_id: selectedId,
  });
  if (error) throw new Error(`Could not load the service workflow: ${error.message}`);
  const workflow = data as Workflow;
  const statuses = workflow.template.config.statuses ?? [];
  const fields = workflow.template.config.fields ?? [];
  const openItems = workflow.items.filter((item) => !item.completed_at);
  const blockedItems = openItems.filter((item) => item.blocked_reason);
  const overdueItems = openItems.filter(
    (item) => item.due_date && item.due_date < localIsoDate(new Date())
  );

  return (
    <div className="space-y-9">
      <section className="grid gap-6 border-b border-rule pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">Configurable workflow engine</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">
            {workflow.template.name}
          </h1>
          <p className="mt-3 max-w-3xl text-faint">
            Operate the client&apos;s real workflow through statuses, ownership, next
            actions, due dates, blockers and department-specific fields. Every
            update stays inside the managed workspace and contributes to service
            reporting.
          </p>
        </div>
        <label className="text-sm font-semibold">
          Managed client
          <select
            className="field mt-1 min-w-[16rem]"
            value={selectedId}
            onChange={() => undefined}
            aria-label="Managed client"
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex flex-wrap gap-2">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/ops/workflows?business=${client.id}`}
                className={
                  client.id === selectedId
                    ? "border border-ledger bg-ledger px-2 py-1 text-xs font-semibold text-paper"
                    : "border border-rule px-2 py-1 text-xs text-faint hover:text-ink"
                }
              >
                {client.name}
              </Link>
            ))}
          </div>
        </label>
      </section>

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Open records" value={openItems.length} />
        <Summary label="Blocked" value={blockedItems.length} />
        <Summary label="Overdue" value={overdueItems.length} />
        <Summary label="Workflow version" value={`v${workflow.template.version}`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <aside className="space-y-5">
          <div className="border border-rule bg-card p-5">
            <p className="eyebrow">Service engagement</p>
            <dl className="mt-4 space-y-3 text-sm">
              <Meta label="Client" value={workflow.business.name} />
              <Meta label="Industry" value={workflow.business.industry || "Not recorded"} />
              <Meta label="Department" value={workflow.template.name} />
              <Meta label="Service level" value={workflow.engagement.service_level} />
              <Meta label="Engagement status" value={workflow.engagement.status} />
              <Meta label="Next review" value={workflow.engagement.next_review_date || "Not scheduled"} />
            </dl>
          </div>

          <details className="border border-rule bg-card p-5" open={workflow.items.length === 0}>
            <summary className="cursor-pointer font-display text-xl text-ledger">
              Add workflow record
            </summary>
            <form action={createWorkflowItem} className="mt-5 grid gap-3">
              <input type="hidden" name="business_id" value={workflow.business.id} />
              <input type="hidden" name="engagement_id" value={workflow.engagement.id} />
              <Field label="Title" name="title" required />
              <Field label="Reference" name="reference" placeholder="Generated if blank" />
              <Select label="Status" name="status" options={statuses} />
              <Field label="Assigned person" name="assigned_name" />
              <Field label="Priority" name="priority" type="number" defaultValue="50" />
              <Field label="Next action" name="next_action" />
              <Field label="Due date" name="due_date" type="date" />
              <Field label="Blocked reason" name="blocked_reason" />
              {fields.map((field) => (
                <DynamicField key={field.key} field={field} />
              ))}
              <button className="btn-primary mt-2">Add record</button>
            </form>
          </details>
        </aside>

        <section className="space-y-4">
          <div>
            <p className="eyebrow">Managed workflow</p>
            <h2 className="mt-1 font-display text-3xl">Records and control points</h2>
          </div>

          {workflow.items.length === 0 ? (
            <div className="border border-dashed border-rule bg-card p-8 text-center">
              <p className="font-display text-2xl">No workflow records yet</p>
              <p className="mt-2 text-faint">
                Add the first real record from the client&apos;s starting data.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflow.items.map((item) => (
                <details key={item.id} className="border border-rule bg-card p-5" open={Boolean(item.blocked_reason)}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="eyebrow">{item.reference}</p>
                        <h3 className="mt-1 font-display text-xl">{item.title}</h3>
                        <p className="mt-2 text-sm text-faint">
                          {item.next_action || "No next action recorded"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Status value={item.status} blocked={Boolean(item.blocked_reason)} />
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-faint">
                          P{item.priority} · {item.due_date || "No due date"}
                        </p>
                      </div>
                    </div>
                  </summary>

                  <form action={updateWorkflowItem} className="mt-5 grid gap-4 border-t border-rule pt-5">
                    <input type="hidden" name="work_item_id" value={item.id} />
                    <input type="hidden" name="business_id" value={workflow.business.id} />
                    <input type="hidden" name="existing_data" value={JSON.stringify(item.data ?? {})} />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Select label="Status" name="status" options={statuses} defaultValue={item.status} />
                      <Field label="Assigned person" name="assigned_name" defaultValue={item.assigned_name || ""} />
                      <Field label="Priority" name="priority" type="number" defaultValue={String(item.priority)} />
                      <Field label="Next action" name="next_action" defaultValue={item.next_action || ""} />
                      <Field label="Due date" name="due_date" type="date" defaultValue={item.due_date || ""} />
                      <Field label="Blocked reason" name="blocked_reason" defaultValue={item.blocked_reason || ""} />
                      {fields.map((field) => (
                        <DynamicField key={field.key} field={field} defaultValue={item.data?.[field.key]} />
                      ))}
                    </div>
                    <label className="text-sm font-semibold">
                      Update note
                      <textarea name="note" className="field mt-1 resize-y" rows={2} placeholder="What changed and why?" />
                    </label>
                    {(item.last_outcome_code || item.last_outcome_note) && (
                      <p className="border-l-2 border-ledger pl-3 text-sm text-faint">
                        Last action outcome: <strong className="text-ink">{item.last_outcome_code || "recorded"}</strong>
                        {item.last_outcome_note ? ` — ${item.last_outcome_note}` : ""}
                      </p>
                    )}
                    <button className="btn-primary justify-self-end">Save workflow update</button>
                  </form>
                </details>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function DynamicField({ field, defaultValue }: { field: TemplateField; defaultValue?: string | number | null }) {
  if (field.type === "select") {
    return (
      <Select
        label={field.label}
        name={`field:${field.key}`}
        options={Object.fromEntries((field.options ?? []).map((option) => [option, option]))}
        required={field.required}
        defaultValue={defaultValue == null ? undefined : String(defaultValue)}
      />
    );
  }
  return (
    <Field
      label={field.label}
      name={`field:${field.key}`}
      type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
      required={field.required}
      defaultValue={defaultValue == null ? "" : String(defaultValue)}
    />
  );
}

function Field({ label, name, type = "text", required = false, placeholder, defaultValue }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input className="field mt-1" name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} />
    </label>
  );
}

function Select({ label, name, options, required = false, defaultValue }: { label: string; name: string; options: string[] | Record<string, string>; required?: boolean; defaultValue?: string }) {
  const entries = Array.isArray(options) ? options.map((value) => [value, value] as const) : Object.entries(options);
  return (
    <label className="text-sm font-semibold">
      {label}
      <select className="field mt-1" name={name} required={required} defaultValue={defaultValue ?? entries[0]?.[0]}>
        {entries.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return <div className="bg-card p-5"><p className="eyebrow">{label}</p><p className="mt-2 font-display text-3xl">{value}</p></div>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-rule pb-2 last:border-0"><dt className="text-faint">{label}</dt><dd className="text-right font-semibold capitalize">{value}</dd></div>;
}

function Status({ value, blocked }: { value: string; blocked: boolean }) {
  return <span className={`inline-block border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${blocked ? "border-stuck text-stuck" : "border-rule text-faint"}`}>{blocked ? "Blocked · " : ""}{value}</span>;
}

function localIsoDate(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
