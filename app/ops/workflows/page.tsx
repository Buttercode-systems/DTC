import Link from "next/link";
import { requireOperator } from "@/lib/operator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Managed Workflows — The Admin Department" };

type Client = {
  id: string;
  name: string;
  industry: string | null;
  department: string | null;
  service_level: string | null;
  engagement_status: string | null;
  service_status: string;
  due_actions: number;
  pending_approvals: number;
};

type Dashboard = { clients?: Client[] };

const DEPARTMENTS: Record<string, string> = {
  invoice: "Invoice Admin",
  sales: "Sales Admin",
  client: "Client Admin",
  property: "Property Admin",
  practice: "Practice / Booking Admin",
  member: "Member Admin",
  core: "Core Business Execution",
};

export default async function ManagedWorkflowsIndexPage() {
  const { supabase } = await requireOperator();
  const { data, error } = await supabase.rpc("get_tad_ops_dashboard");
  if (error) throw new Error(`Could not load managed workflows: ${error.message}`);

  const clients = ((data ?? {}) as Dashboard).clients ?? [];

  return (
    <div className="space-y-8">
      <section className="border-b border-rule pb-7">
        <p className="eyebrow">Configurable service workflows</p>
        <h1 className="mt-2 max-w-4xl font-display text-4xl leading-tight sm:text-6xl">
          Open the department workflow you are operating.
        </h1>
        <p className="mt-4 max-w-3xl text-faint">
          Each managed client has a private workflow built from a versioned department
          template. Records carry statuses, owners, next actions, due dates, blockers,
          evidence and an audit history. Due items feed the shared operator queue.
        </p>
      </section>

      {clients.length === 0 ? (
        <section className="max-w-3xl border border-dashed border-rule bg-card p-8">
          <h2 className="font-display text-3xl">No managed workflows yet</h2>
          <p className="mt-3 text-faint">
            Onboard a client from the Operations Console. The first service engagement
            creates the managed workspace and its workflow template.
          </p>
          <Link href="/ops#clients" className="btn-primary mt-6">
            Onboard the first client
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <article key={client.id} className="border border-rule bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">
                    {DEPARTMENTS[client.department ?? ""] ?? "Managed workflow"}
                  </p>
                  <h2 className="mt-1 font-display text-2xl">{client.name}</h2>
                  <p className="mt-1 text-sm text-faint">
                    {client.industry || "Industry not recorded"}
                  </p>
                </div>
                <span className="border border-rule px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                  {client.engagement_status ?? client.service_status}
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-rule pt-4 text-sm">
                <Metric label="Service" value={client.service_level || "Not set"} />
                <Metric label="Due actions" value={String(client.due_actions ?? 0)} />
                <Metric label="Approvals" value={String(client.pending_approvals ?? 0)} />
                <Metric label="Workspace" value="TAD managed" />
              </dl>

              <Link href={`/ops/client/${client.id}`} className="btn-primary mt-5 w-full">
                Open managed workflow
              </Link>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-1 font-semibold capitalize">{value}</dd>
    </div>
  );
}
