import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/db";
import {
  createDepartmentRecord,
  updateDepartmentRecord,
} from "../workflow-actions";

export const dynamic = "force-dynamic";

const DEPARTMENTS = new Set(["invoice", "sales", "client", "property", "practice", "member"]);

type FieldDefinition = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "url" | "select";
  required?: boolean;
  options?: string[];
};

type TemplateConfig = {
  statuses: string[];
  closed_statuses: string[];
  fields: FieldDefinition[];
  data_warning?: string;
};

type WorkItem = {
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
  updated_at: string;
};

export function generateMetadata({ params }: { params: { department: string } }) {
  const name = params.department.charAt(0).toUpperCase() + params.department.slice(1);
  return { title: `${name} Admin — The Admin Department` };
}

export default async function DepartmentPage({
  params,
}: {
  params: { department: string };
}) {
  if (!DEPARTMENTS.has(params.department)) notFound();
  const { supabase, business } = await requireBusiness();

  const { data: engagement, error: engagementError } = await supabase
    .from("service_engagements")
    .select("id,department,delivery_mode,status,enabled,template_key,service_level,next_review_date")
    .eq("business_id", business.id)
    .eq("department", params.department)
    .maybeSingle();
  if (engagementError) throw new Error(`Could not load department: ${engagementError.message}`);
  if (!engagement || !engagement.enabled) notFound();

  const { data: template, error: templateError } = await supabase
    .from("service_workflow_templates")
    .select("key,name,version,config")
    .eq("key", engagement.template_key)
    .single();
  if (templateError) throw new Error(`Could not load workflow template: ${templateError.message}`);

  const { data: items, error: itemsError } = await supabase
    .from("service_work_items")
    .select("id,reference,title,status,assigned_name,priority,next_action,due_date,blocked_reason,data,last_outcome_code,last_outcome_note,updated_at")
    .eq("business_id", business.id)
    .eq("engagement_id", engagement.id)
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true });
  if (itemsError) throw new Error(`Could not load workflow records: ${itemsError.message}`);

  const config = template.config as TemplateConfig;
  const records = (items ?? []) as WorkItem[];
  const closed = new Set(config.closed_statuses ?? []);
  const today = new Date().toISOString().slice(0, 10);
  const open = records.filter((item) => !closed.has(item.status));
  const blocked = open.filter((item) => Boolean(item.blocked_reason));
  const overdue = open.filter((item) => item.due_date && item.due_date < today);

  return (
    <div className="space-y-8">
      <section className="border-b border-rule pb-7">
        <Link href="/app/departments" className="font-mono text-xs text-ledger hover:underline">
          ← All departments
        </Link>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="badge">{engagement.delivery_mode === "managed" ? "Managed by TAD" : "Self-service"}</span>
              <span className="badge">{engagement.status}</span>
              <span className="badge">Template {template.version}</span>
            </div>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl">{template.name}</h1>
            <p className="mt-2 text-faint">{business.name} · Next review {engagement.next_review_date ?? "not scheduled"}</p>
          </div>
          <Link href="/app" className="btn-secondary">Open unified Today</Link>
        </div>
      </section>

      {config.data_warning && (
        <div className="border border-slowing/40 bg-slowing/10 px-4 py-3 text-sm">
          <strong>Protected workflow.</strong> {config.data_warning}
        </div>
      )}

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Total records" value={records.length} />
        <Summary label="Open" value={open.length} />
        <Summary label="Blocked" value={blocked.length} />
        <Summary label="Overdue" value={overdue.length} />
      </section>

      <section>
        <p className="eyebrow">Workflow map</p>
        <div className="mt-3 flex gap-px overflow-x-auto border border-rule bg-rule [scrollbar-width:none]">
          {(config.statuses ?? []).map((status) => (
            <div key={status} className="min-w-36 flex-1 bg-card p-3">
              <p className="text-xs font-semibold leading-5">{status}</p>
              <p className="mt-2 font-display text-2xl">{records.filter((item) => item.status === status).length}</p>
            </div>
          ))}
        </div>
      </section>

      <details className="border border-rule bg-card p-5 shadow-card">
        <summary className="cursor-pointer font-display text-2xl">+ Add record</summary>
        <form action={createDepartmentRecord} className="mt-5 grid gap-4">
          <input type="hidden" name="department" value={params.department} />
          <input type="hidden" name="engagement_id" value={engagement.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Reference" name="reference" placeholder="Generated if blank" />
            <Input label="Record title" name="title" required />
            <Select label="Starting status" name="status" options={config.statuses ?? []} />
            <Input label="Assigned person" name="assigned_name" />
            <Input label="Priority, 0–100" name="priority" type="number" defaultValue="50" />
            <Input label="Next action due" name="due_date" type="date" />
          </div>
          <Input label="Next action" name="next_action" />
          <Input label="Blocked reason" name="blocked_reason" />
          <div className="grid gap-4 md:grid-cols-2">
            {(config.fields ?? []).map((field) => <DynamicField key={field.key} field={field} />)}
          </div>
          <button className="btn-primary justify-self-end">Create record</button>
        </form>
      </details>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Active records</p>
          <h2 className="mt-1 font-display text-3xl">Operate the workflow</h2>
        </div>
        {records.length === 0 ? (
          <div className="border border-dashed border-rule bg-card/40 p-8 text-center">
            <h3 className="font-display text-2xl">No records yet</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-faint">Add the current backlog or use the Import centre when bulk import is enabled.</p>
          </div>
        ) : records.map((item) => (
          <article key={item.id} className={`border bg-card p-5 ${item.blocked_reason ? "border-stuck/50" : "border-rule"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{item.reference}</p>
                <h3 className="mt-1 font-display text-2xl">{item.title}</h3>
                <p className="mt-2 text-sm text-faint">{item.assigned_name || "No owner"} · Due {item.due_date || "not set"} · Priority {item.priority}</p>
              </div>
              <span className="badge">{item.status}</span>
            </div>
            {item.blocked_reason && <p className="mt-4 border-l-2 border-stuck pl-3 text-sm"><strong>Blocked:</strong> {item.blocked_reason}</p>}
            <p className="mt-4 text-sm"><strong>Next:</strong> {item.next_action || "No next action recorded"}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(config.fields ?? []).map((field) => (
                <div key={field.key} className="border-t border-rule pt-2 text-sm">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-faint">{field.label}</span>
                  <strong className="mt-1 block break-words">{displayValue(item.data[field.key])}</strong>
                </div>
              ))}
            </div>
            <details className="mt-5 border-t border-rule pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-ledger">Update record</summary>
              <form action={updateDepartmentRecord} className="mt-4 grid gap-4">
                <input type="hidden" name="department" value={params.department} />
                <input type="hidden" name="work_item_id" value={item.id} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Select label="Status" name="status" options={config.statuses ?? []} defaultValue={item.status} />
                  <Input label="Assigned person" name="assigned_name" defaultValue={item.assigned_name ?? ""} />
                  <Input label="Priority, 0–100" name="priority" type="number" defaultValue={String(item.priority)} />
                  <Input label="Next action due" name="due_date" type="date" defaultValue={item.due_date ?? ""} />
                </div>
                <Input label="Next action" name="next_action" defaultValue={item.next_action ?? ""} />
                <Input label="Blocked reason" name="blocked_reason" defaultValue={item.blocked_reason ?? ""} />
                <div className="grid gap-4 md:grid-cols-2">
                  {(config.fields ?? []).map((field) => <DynamicField key={field.key} field={field} defaultValue={item.data[field.key]} />)}
                </div>
                <Input label="Change note" name="note" placeholder="Why did this change?" />
                <button className="btn-primary justify-self-end">Save record</button>
              </form>
            </details>
          </article>
        ))}
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <article className="bg-card p-4"><p className="eyebrow">{label}</p><strong className="mt-2 block font-display text-3xl">{value}</strong></article>;
}

function Input({ label, name, type = "text", required = false, placeholder, defaultValue }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string }) {
  return <label className="text-sm font-semibold">{label}<input className="field mt-1" name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} /></label>;
}

function Select({ label, name, options, defaultValue }: { label: string; name: string; options: string[]; defaultValue?: string }) {
  return <label className="text-sm font-semibold">{label}<select className="field mt-1" name={name} defaultValue={defaultValue}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function DynamicField({ field, defaultValue }: { field: FieldDefinition; defaultValue?: string | number | null }) {
  const name = `data.${field.key}`;
  if (field.type === "select") {
    return <label className="text-sm font-semibold">{field.label}<select className="field mt-1" name={name} defaultValue={String(defaultValue ?? "")} required={field.required}><option value="">Choose</option>{(field.options ?? []).map((option) => <option key={option}>{option}</option>)}</select></label>;
  }
  return <Input label={field.label} name={name} type={field.type} required={field.required} defaultValue={defaultValue == null ? "" : String(defaultValue)} />;
}

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
