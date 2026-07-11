import Link from "next/link";
import { requireOperator } from "@/lib/operator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Managed Client Workflows — The Admin Department" };

type Client = {
  id: string;
  name: string;
  industry: string | null;
  service_status: string;
  engagement_id: string | null;
  department: string | null;
  service_level: string | null;
  engagement_status: string | null;
  next_review_date: string | null;
  due_actions: number;
  pending_approvals: number;
};

type Dashboard = {
  clients?: Client[];
};

const DEPARTMENTS: Record<string, string> = {
  invoice: "Invoice Admin",
  sales: "Sales Admin",
  client: "Client Admin",
  property: "Property Admin",
  practice: "Practice / Booking Admin",
  member: "Member Admin",
  core: "DueToday Core",
};

export default async function ManagedWorkflowPortfolioPage() {
  const { supabase } = await requireOperator();
  const { data, error } = await supabase.rpc("get_tad_ops_dashboard");
  if (error) throw new Error(`Could not load managed workflows: ${error.message}`);
  const clients = ((data ?? {}) as Dashboard).clients ?? [];

  return (
    <div className="space-y-9">
      <section className="grid gap-6 border-b border-rule pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow">Managed client workflows</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl leading-[1.02] sm:text-6xl">
            One workflow portfolio across every client.
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-faint">
            Open the client’s installed department, organise the starting backlog, assign owners, record the next action and let DueToday surface what is due.
          </p>
        </div>
        <Link href="/ops" className="btn-secondary">Back to control room</Link>
      </section>

      {clients.length === 0 ? (
        <div className="border border-dashed border-rule bg-card p-8 text-center">
          <h2 className="font-display text-2xl">No managed client workflow exists yet.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-faint">
            Onboard the first business in the control room. Its selected department template will become the first managed workflow.
          </p>
          <Link href="/ops#clients" className="btn-primary mt-5">Onboard a client</Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <article key={client.id} className="border border-rule bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">{DEPARTMENTS[client.department ?? ""] ?? "Workflow not assigned"}</p>
                  <h2 className="mt-1 font-display text-2xl">{client.name}</h2>
                  <p className="mt-1 text-sm text-faint">{client.industry || "Industry not recorded"}</p>
                </div>
                <span className="border border-rule px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                  {client.engagement_status ?? client.service_status}
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-rule pt-4 text-sm">
                <Metric label="Service" value={client.service_level || "Not set"} />
                <Metric label="Next review" value={client.next_review_date || "Not scheduled"} />
                <Metric label="Due actions" value={String(client.due_actions ?? 0)} />
                <Metric label="Approvals" value={String(client.pending_approvals ?? 0)} />
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                {client.engagement_id ? (
                  <Link href={`/ops/client/${client.id}`} className="btn-primary !px-3 !py-2 text-sm">
                    Open workflow
                  </Link>
                ) : (
                  <span className="border border-rule px-3 py-2 text-sm text-faint">Engagement not installed</span>
                )}
                <Link href={`/ops#clients`} className="btn-secondary !px-3 !py-2 text-sm">Client overview</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
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
