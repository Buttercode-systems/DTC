import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/operator";
import { openManagedBusiness } from "@/app/ops/actions";
import {
  createWorkflowItem,
  updateWorkflowItem,
} from "@/app/ops/workflow-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Managed Workflow — The Admin Department" };

type FieldDefinition = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "url" | "select";
  required?: boolean;
  options?: string[];
};

type WorkflowItem = {
  id: string;
  business_id: string;
  engagement_id: string;
  department: string;
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
  business: {
    id: string;
    name: string;
    industry: string | null;
    service_status: string;
  };
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
      fields: FieldDefinition[];
      data_warning?: string;
    };
  };
  items: WorkflowItem[];
};

export default async function ManagedWorkflowPage({
  params,
}: {
  params: { businessId: string };
}) {
  const { supabase } = await requireOperator();
  const { error: syncError } = await supabase.rpc(
    "sync_service_workflow_actions",
    { p_business_id: params.businessId }
  );
  if (syncError && !syncError.message.includes("service_workflow")) {
    throw new Error(`Could not sync workflow actions: ${syncError.message}`);
  }

  const { data, error } = await supabase.rpc("get_service_workflow", {
    p_business_id: params.businessId,
  });
  if (error) {
    if (error.message.includes("not found")) notFound();
    throw new Error(`Could not load managed workflow: ${error.message}`);
  }

  const workflow = data as Workflow;
  const statuses = workflow.template.config.statuses ?? [];
  const closed = new Set(workflow.template.config.closed_statuses ?? []);
  const today = johannesburgDate();
  const openItems = workflow.items.filter((item) => !closed.has(item.status));
  const blockedItems = openItems.filter((item) => Boolean(item.blocked_reason));
  const overdueItems = openItems.filter(
    (item) => item.due_date && item.due_date < today
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-6 border-b border-rule pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/ops" className="font-mono text-xs text-ledger hover:underline">
              ← Operations Console
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
              Template {workflow.template.version}
            </span>
          </div>
          <p className="eyebrow mt-5">{workflow.template.name}</p>
          <h1 className="mt-1 font-display text-4xl leading-tight sm:text-5xl">
            {workflow.business.name}
          </h1>
          <p className="mt-3 max-w-3xl text-faint">
            {workflow.business.industry || "Industry not recorded"} · {workflow.engagement.service_level} · {workflow.engagement.status}
          </p>
        </div>
        <form action={openManagedBusiness}>
          <input type="hidden" name="business_id" value={workflow.business.id} />
          <button className="btn-primary">Open client Today list</button>
        </form>
      </section>

      {workflow.template.config.data_warning && (
        <div className="border border-slowing/40 bg-slowing/10 px-4 py-3 text-sm">
          <strong>Protected workflow.</strong>{" "}
          {workflow.template.config.data_warning}
        </div>
      )}

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Total records" value={workflow.items.length} />
        <Summary label="Open" value={openItems.length} />
        <Summary label="Blocked" value={blockedItems.length} />
        <Summary label="Overdue" value={overdueItems.length} />
      </section>

      <section>
        <p className="eyebrow">Workflow map</p>
        <div className="mt-3 flex gap-px overflow-x-auto border border-rule bg-rule [scrollbar-width:none]">
          {statuses.map((status) => {
            const count = workflow.items.filter((item) => item.status === status).length;
            return (
              <div key={status} className="min-w-36 flex-1 bg-card p-3">
                <p className="text-xs font-semibold leading-5">{status}</p>
                <p className="mt-2 font-display text-2xl">{count}</p>
              </div>
            );
          })}
        </div>
      </section>

      <details className="border border-rule bg-card p-5 shadow-card">
        <summary className="cursor-pointer font-display text-2xl">
          + Add {workflow.template.name} record
        </summary>
        <form action={createWorkflowItem} className="mt-5 grid gap-4">
          <input type="hidden" name="business_id" value={workflow.business.id} />
          <input type="hidden" name="engagement_id" value={workflow.engagement.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Reference" name="reference" placeholder="Generated if blank" />
            <Input label="Record title" name="title" required />
            <Select label="Starting status" name="status" options={statuses} />
            <Input label="Assigned person" name="assigned_name" />
            <Input label="Priority, 0–100" name="priority" type="number" defaultValue="50" />
            <Input label="Next action due" name="due_date" type="date" />
          </div>
          <Input label="Next action" name="next_action" />
          <Input label="Blocked reason" name="blocked_reason" />
          <div className="grid gap-4 md:grid-cols-2">
            {workflow.template.config.fields.map((field) => (
              <DynamicField key={field.key} field={field} />
            ))}
          </div>
          <button className="btn-primary justify-self-end">Create workflow record</button>
        </form>
      </details>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Active records</p>
          <h2 className="mt-1 font-display text-3xl">Move the workflow</h2>
        </div>

        {workflow.items.length === 0 ? (
          <div className="border border-dashed border-rule bg-card/40 p-8 text-center">
            <h3 className="font-display text-2xl">No records yet.</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-faint">
              Add the real starting backlog. Records without an owner, next action or current due date will surface in DueToday automatically.
            </p>
          </div>
        ) : (
          workflow.items.map((item) => (
            <article
              key={item.id}
              className={`border bg-card p-5 ${item.blocked_reason ? "border-stuck/50" : "border-rule"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{item.reference}</p>
                  <h3 className="mt-1 font-display text-2xl">{item.title}</h3>
                  <p className="mt-2 text-sm text-faint">
                    {item.assigned_name || "No owner"} · Due {item.due_date || "not set"} · Priority {item.priority}
                  </p>
                </div>
                <span className="border border-ledger/40 bg-ledger/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ledger">
                  {item.status}
                </span>
              </div>

              {item.blocked_reason && (
                <p className="mt-4 border-l-2 border-stuck pl-3 text-sm">
                  <strong>Blocked:</strong> {item.blocked_reason}
                </p>
              )}
              <p className="mt-4 text-sm">
                <strong>Next:</strong> {item.next_action || "No next action recorded"}
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {workflow.template.config.fields.map((field) => (
                  <div key={field.key} className="border-t border-rule pt-2 text-sm">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-faint">
                      {field.label}
                    </span>
                    <strong className="mt-1 block break-words">
                      {displayValue(item.data[field.key])}
                    </strong>
                  </div>
                ))}
              </div>

              {item.last_outcome_code && (
                <p className="mt-4 text-xs text-faint">
                  Last outcome: <strong>{item.last_outcome_code}</strong>
                  {item.last_outcome_note ? ` · ${item.last_outcome_note}` : ""}
                </p>
              )}

              <details className="mt-5 border-t border-rule pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-ledger">
                  Update record
                </summary>
                <form action={updateWorkflowItem} className="mt-4 grid gap-4">
                  <input type="hidden" name="business_id" value={workflow.business.id} />
                  <input type="hidden" name="work_item_id" value={item.id} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select label="Status" name="status" options={statuses} defaultValue={item.status} />
                    <Input label="Assigned person" name="assigned_name" defaultValue={item.assigned_name ?? ""} />
                    <Input label="Priority, 0–100" name="priority" type="number" defaultValue={String(item.priority)} />
                    <Input label="Next action due" name="due_date" type="date" defaultValue={item.due_date ?? ""} />
                  </div>
                  <Input label="Next action" name="next_action" defaultValue={item.next_action ?? ""} />
                  <Input label="Blocked reason" name="blocked_reason" defaultValue={item.blocked_reason ?? ""} />
                  <div className="grid gap-4 md:grid-cols-2">
                    {workflow.template.config.fields.map((field) => (
                      <DynamicField
                        key={field.key}
                        field={field}
                        defaultValue={item.data[field.key]}
                      />
                    ))}
                  </div>
                  <Input label="Change note" name="note" placeholder="Why did this change?" />
                  <button className="btn-primary justify-self-end">Save record</button>
                </form>
              </details>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <article className="bg-card p-4">
      <p className="eyebrow">{label}</p>
      <strong className="mt-2 block font-display text-3xl">{value}</strong>
    </article>
  );
}

function Input({
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
        className="field mt-1"
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
    </label>
  );
}

function Select({
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
      <select className="field mt-1" name={name} defaultValue={defaultValue}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function DynamicField({
  field,
  defaultValue,
}: {
  field: FieldDefinition;
  defaultValue?: string | number | null;
}) {
  const name = `data.${field.key}`;
  if (field.type === "select") {
    return (
      <label className="text-sm font-semibold">
        {field.label}
        <select className="field mt-1" name={name} defaultValue={String(defaultValue ?? "")} required={field.required}>
          <option value="">Choose</option>
          {(field.options ?? []).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <Input
      label={field.label}
      name={name}
      type={field.type}
      required={field.required}
      defaultValue={String(defaultValue ?? "")}
    />
  );
}

function displayValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function johannesburgDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
