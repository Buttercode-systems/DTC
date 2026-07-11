import Link from "next/link";
import { requireOperator } from "@/lib/operator";
import {
  createWorkflowRecord,
  installWorkflow,
  syncWorkflowQueue,
  updateWorkflowRecord,
} from "@/app/ops/workflows/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Managed Workflows — The Admin Department" };

type Client = {
  id: string;
  name: string;
  industry: string | null;
  department: string | null;
  service_status: string;
};

type TemplateDefinition = {
  statuses?: string[];
  terminal_statuses?: string[];
  default_status?: string;
  required_controls?: string[];
  fields?: string[];
};

type Template = {
  id: string;
  template_key: string;
  department: string;
  name: string;
  description: string;
  version: number;
  definition: TemplateDefinition;
  installed: boolean;
};

type Instance = {
  id: string;
  name: string;
  status: string;
  template_key: string;
  department: string;
  template_name: string;
  definition: TemplateDefinition;
  installed_version: number;
};

type WorkflowRecord = {
  id: string;
  workflow_instance_id: string;
  workflow_name: string;
  department: string;
  reference: string | null;
  title: string;
  status: string;
  owner_label: string | null;
  assigned_to: string | null;
  next_action: string | null;
  due_date: string | null;
  priority: number;
  fields: Record<string, unknown>;
  source: string;
  last_outcome_code: string | null;
  last_outcome_note: string | null;
  last_outcome_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type WorkflowEvent = {
  event_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
  record_title: string | null;
};

type Workspace = {
  summary: {
    installed: number;
    active_records: number;
    due_records: number;
    unowned_records: number;
  };
  templates: Template[];
  instances: Instance[];
  records: WorkflowRecord[];
  events: WorkflowEvent[];
};

type OpsDashboard = {
  clients?: Client[];
};

const EMPTY: Workspace = {
  summary: { installed: 0, active_records: 0, due_records: 0, unowned_records: 0 },
  templates: [],
  instances: [],
  records: [],
  events: [],
};

export default async function WorkflowOperationsPage({
  searchParams,
}: {
  searchParams?: { business?: string };
}) {
  const { supabase } = await requireOperator();
  const { data: opsData, error: opsError } = await supabase.rpc("get_tad_ops_dashboard");
  if (opsError) throw new Error(`Could not load managed clients: ${opsError.message}`);

  const clients = ((opsData ?? {}) as OpsDashboard).clients ?? [];
  const requested = searchParams?.business;
  const selectedClient = clients.find((client) => client.id === requested) ?? clients[0] ?? null;

  let workspace = EMPTY;
  if (selectedClient) {
    const { data, error } = await supabase.rpc("get_workflow_workspace", {
      p_business_id: selectedClient.id,
    });
    if (error) throw new Error(`Could not load workflow workspace: ${error.message}`);
    workspace = (data ?? EMPTY) as Workspace;
  }

  const instanceMap = new Map(workspace.instances.map((instance) => [instance.id, instance]));
  const recordsByInstance = new Map<string, WorkflowRecord[]>();
  for (const record of workspace.records) {
    const list = recordsByInstance.get(record.workflow_instance_id) ?? [];
    list.push(record);
    recordsByInstance.set(record.workflow_instance_id, list);
  }

  return (
    <div className="space-y-10">
      <section className="grid gap-7 border-b border-rule pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">Configurable service engine</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl leading-[1.02] sm:text-6xl">
            Install one workflow. Run every record with the same controls.
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-faint">
            The six TAD departments now share one secure operating method: status, owner,
            next action, due date, human outcome and visible history. Templates define the
            workflow; DueToday turns control gaps and due records into daily actions.
          </p>
        </div>
        <Link href="/ops" className="btn-secondary">
          Back to control room
        </Link>
      </section>

      {clients.length === 0 ? (
        <EmptyState
          title="No managed client exists yet."
          detail="Onboard a business in the control room before installing its first department workflow."
          href="/ops#clients"
          action="Onboard a client"
        />
      ) : (
        <>
          <section className="space-y-4">
            <div>
              <p className="eyebrow">Client workspace</p>
              <h2 className="mt-1 font-display text-3xl">Choose the business to configure</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {clients.map((client) => {
                const active = client.id === selectedClient?.id;
                return (
                  <Link
                    key={client.id}
                    href={`/ops/workflows?business=${client.id}`}
                    className={
                      active
                        ? "border border-ledger bg-ledger px-4 py-3 text-sm font-semibold text-paper"
                        : "border border-rule bg-card px-4 py-3 text-sm font-semibold hover:border-ink"
                    }
                  >
                    {client.name}
                  </Link>
                );
              })}
            </div>
          </section>

          {selectedClient && (
            <>
              <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Installed workflows" value={workspace.summary.installed} note={selectedClient.name} />
                <SummaryCard label="Active records" value={workspace.summary.active_records} note="Still moving through a workflow" />
                <SummaryCard label="Due records" value={workspace.summary.due_records} note="Needs action now" />
                <SummaryCard label="Unowned records" value={workspace.summary.unowned_records} note="Control gap to fix" />
              </section>

              <section className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">Template library</p>
                    <h2 className="mt-1 font-display text-3xl">Install a managed department</h2>
                    <p className="mt-2 max-w-3xl text-faint">
                      Each template preserves its own statuses and fields while sharing the same
                      daily control rules. Installing does not create fake records.
                    </p>
                  </div>
                  <form action={syncWorkflowQueue}>
                    <input type="hidden" name="business_id" value={selectedClient.id} />
                    <button className="btn-secondary" type="submit">Refresh Today actions</button>
                  </form>
                </div>

                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {workspace.templates.map((template) => (
                    <article key={template.id} className="border border-rule bg-card p-5 shadow-card">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="eyebrow">{template.department} · v{template.version}</p>
                          <h3 className="mt-1 font-display text-2xl">{template.name}</h3>
                        </div>
                        <Status value={template.installed ? "installed" : "available"} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-faint">{template.description}</p>
                      <dl className="mt-4 grid gap-2 border-t border-rule pt-4 text-sm">
                        <Metric label="Statuses" value={String(template.definition.statuses?.length ?? 0)} />
                        <Metric label="Controls" value={(template.definition.required_controls ?? []).join(" · ") || "Standard controls"} />
                      </dl>
                      {!template.installed && (
                        <form action={installWorkflow} className="mt-5">
                          <input type="hidden" name="business_id" value={selectedClient.id} />
                          <input type="hidden" name="template_key" value={template.template_key} />
                          <button className="btn-primary w-full" type="submit">Install {template.name}</button>
                        </form>
                      )}
                    </article>
                  ))}
                </div>
              </section>

              <section className="space-y-6 border-t border-rule pt-8">
                <div>
                  <p className="eyebrow">Installed workflows</p>
                  <h2 className="mt-1 font-display text-3xl">Operate the client records</h2>
                  <p className="mt-2 max-w-3xl text-faint">
                    An active record must always show its status, responsible owner, next action
                    and due date. Missing controls automatically surface on the DueToday queue.
                  </p>
                </div>

                {workspace.instances.length === 0 ? (
                  <EmptyState title="No workflow installed." detail="Install the client’s fix-first department above." />
                ) : (
                  <div className="space-y-8">
                    {workspace.instances.map((instance) => {
                      const records = recordsByInstance.get(instance.id) ?? [];
                      const statuses = instance.definition.statuses ?? [];
                      return (
                        <article key={instance.id} className="border border-rule bg-card p-5 shadow-card sm:p-6">
                          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5">
                            <div>
                              <p className="eyebrow">{instance.department} · template v{instance.installed_version}</p>
                              <h3 className="mt-1 font-display text-3xl">{instance.name}</h3>
                              <p className="mt-2 text-sm text-faint">
                                {records.length} record{records.length === 1 ? "" : "s"} · {statuses.length} workflow statuses
                              </p>
                            </div>
                            <Status value={instance.status} />
                          </div>

                          <details className="mt-5 border border-rule bg-paper p-4">
                            <summary className="cursor-pointer font-semibold text-ledger">+ Add a real workflow record</summary>
                            <form action={createWorkflowRecord} className="mt-4 grid gap-3">
                              <input type="hidden" name="workflow_instance_id" value={instance.id} />
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Reference" name="reference" placeholder="INV-104 or PROP-22" />
                                <Field label="Record title" name="title" required placeholder="What is moving through this workflow?" />
                                <SelectField label="Starting status" name="status" options={statuses} defaultValue={instance.definition.default_status ?? statuses[0]} />
                                <Field label="Responsible owner" name="owner_label" placeholder="Nomsa / Accounts / Client" />
                                <Field label="Next action" name="next_action" placeholder="Request missing VAT number" />
                                <Field label="Due date" name="due_date" type="date" />
                                <Field label="Priority (0–100)" name="priority" type="number" defaultValue="50" />
                              </div>
                              <label className="text-sm font-semibold">
                                Supporting detail
                                <textarea name="detail" className="field mt-1 resize-y" rows={3} placeholder="Process context only. Do not paste protected records unnecessarily." />
                              </label>
                              <button className="btn-primary justify-self-end" type="submit">Create workflow record</button>
                            </form>
                          </details>

                          {records.length === 0 ? (
                            <div className="mt-5 border border-dashed border-rule p-5 text-sm text-faint">
                              No records yet. Add the starting backlog only after the client has approved the private workspace and data boundary.
                            </div>
                          ) : (
                            <div className="mt-5 space-y-3">
                              {records.map((record) => (
                                <WorkflowRecordCard
                                  key={record.id}
                                  record={record}
                                  instance={instanceMap.get(record.workflow_instance_id) ?? instance}
                                />
                              ))}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="space-y-5 border-t border-rule pt-8">
                <div>
                  <p className="eyebrow">Audit trail</p>
                  <h2 className="mt-1 font-display text-3xl">Recent workflow activity</h2>
                </div>
                {workspace.events.length === 0 ? (
                  <EmptyState title="No workflow events yet." detail="Installation and record changes will appear here." />
                ) : (
                  <div className="border border-rule bg-card p-5">
                    <ul className="ruled">
                      {workspace.events.map((event, index) => (
                        <li key={`${event.created_at}-${index}`} className="py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-sm">{labelEvent(event.event_name)}</p>
                              <p className="mt-1 text-xs text-faint">{event.record_title ?? "Workflow configuration"}</p>
                            </div>
                            <time className="font-mono text-[10px] text-faint">{new Date(event.created_at).toLocaleString("en-ZA")}</time>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function WorkflowRecordCard({ record, instance }: { record: WorkflowRecord; instance: Instance }) {
  const statuses = instance.definition.statuses ?? [record.status];
  const terminal = (instance.definition.terminal_statuses ?? []).includes(record.status);
  const detail = typeof record.fields?.detail === "string" ? record.fields.detail : null;

  return (
    <article className="border border-rule bg-paper p-4">
      <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{record.reference || "No reference"} · P{record.priority}</p>
              <h4 className="mt-1 font-display text-xl">{record.title}</h4>
            </div>
            <Status value={record.status} />
          </div>
          <dl className="mt-4 grid gap-x-5 gap-y-3 border-t border-rule pt-4 text-sm sm:grid-cols-2">
            <Metric label="Owner" value={record.owner_label || (record.assigned_to ? "Assigned user" : "Missing")} />
            <Metric label="Due" value={record.due_date || "No due date"} />
            <Metric label="Next action" value={record.next_action || "Missing"} />
            <Metric label="Last outcome" value={record.last_outcome_code || "None recorded"} />
          </dl>
          {detail && <p className="mt-4 text-sm leading-6 text-faint">{detail}</p>}
          {record.last_outcome_note && (
            <p className="mt-3 border-l-2 border-ledger pl-3 text-sm text-faint">
              Latest: {record.last_outcome_note}
            </p>
          )}
        </div>

        <form action={updateWorkflowRecord} className="grid gap-2 border border-rule bg-card p-3">
          <input type="hidden" name="record_id" value={record.id} />
          <label className="text-xs font-semibold">
            Status
            <select name="status" className="field mt-1 !py-2 text-sm" defaultValue={record.status}>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold">
            Responsible owner
            <input name="owner_label" className="field mt-1 !py-2 text-sm" defaultValue={record.owner_label ?? ""} />
          </label>
          <label className="text-xs font-semibold">
            Next action
            <input name="next_action" className="field mt-1 !py-2 text-sm" defaultValue={record.next_action ?? ""} disabled={terminal} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold">
              Due date
              <input name="due_date" type="date" className="field mt-1 !py-2 text-sm" defaultValue={record.due_date ?? ""} disabled={terminal} />
            </label>
            <label className="text-xs font-semibold">
              Priority
              <input name="priority" type="number" min="0" max="100" className="field mt-1 !py-2 text-sm" defaultValue={record.priority} />
            </label>
          </div>
          <button className="btn-primary mt-1 !px-3 !py-2 text-sm" type="submit">Save controls</button>
        </form>
      </div>
    </article>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <article className="bg-card p-5">
      <p className="font-mono text-[11px] uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-2 font-display text-4xl">{value}</p>
      <p className="mt-2 text-sm text-faint">{note}</p>
    </article>
  );
}

function Status({ value }: { value: string }) {
  return (
    <span className="border border-rule px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-faint">
      {value.replaceAll("_", " ")}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="field mt-1"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select name={name} className="field mt-1" defaultValue={defaultValue}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function EmptyState({
  title,
  detail,
  href,
  action,
}: {
  title: string;
  detail: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="border border-dashed border-rule bg-card p-8 text-center">
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-faint">{detail}</p>
      {href && action && <Link href={href} className="btn-primary mt-5">{action}</Link>}
    </div>
  );
}

function labelEvent(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
