import Link from "next/link";
import { requireOperator } from "@/lib/operator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Client Access — The Admin Department" };

type Client = {
  id: string;
  name: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  department: string | null;
  service_status: string;
  engagement_status: string | null;
};

type Dashboard = { clients: Client[] };
type Access = {
  memberships: Array<{ active: boolean }>;
  invitations: Array<{ status: string }>;
};

const DEPARTMENTS: Record<string, string> = {
  invoice: "Invoice Admin",
  sales: "Sales Admin",
  client: "Client Admin",
  property: "Property Admin",
  practice: "Practice / Booking Admin",
  member: "Member Admin",
  core: "Core Admin",
};

export default async function ClientAccessOverviewPage() {
  const { supabase } = await requireOperator();
  const { data, error } = await supabase.rpc("get_tad_ops_dashboard");
  if (error) throw new Error(`Could not load managed clients: ${error.message}`);
  const dashboard = (data ?? { clients: [] }) as Dashboard;

  const clients = await Promise.all(
    dashboard.clients.map(async (client) => {
      const result = await supabase.rpc("get_managed_client_access", {
        p_business_id: client.id,
      });
      if (result.error) throw new Error(`Could not load access for ${client.name}: ${result.error.message}`);
      const access = (result.data ?? { memberships: [], invitations: [] }) as Access;
      return {
        ...client,
        activeAccess: access.memberships.filter((membership) => membership.active).length,
        pendingInvites: access.invitations.filter((invitation) => invitation.status === "pending").length,
      };
    })
  );

  return (
    <div className="space-y-8">
      <section className="border-b border-rule pb-7">
        <p className="eyebrow">Managed-service security</p>
        <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">Client access</h1>
        <p className="mt-3 max-w-3xl leading-7 text-faint">
          A managed workspace is not client-ready until a named person has claimed an email-matched invitation. Review every active login and pending link here.
        </p>
      </section>

      <section className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
        <Summary label="Managed workspaces" value={clients.length} />
        <Summary label="Active client logins" value={clients.reduce((sum, client) => sum + client.activeAccess, 0)} />
        <Summary label="Pending invitations" value={clients.reduce((sum, client) => sum + client.pendingInvites, 0)} />
      </section>

      {clients.length === 0 ? (
        <div className="border border-dashed border-rule bg-card/40 p-8 text-center">
          <h2 className="font-display text-2xl">No managed workspaces yet</h2>
          <p className="mt-2 text-faint">Qualified and commercially accepted applications will appear here after onboarding.</p>
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {clients.map((client) => (
            <article key={client.id} className="border border-rule bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{DEPARTMENTS[client.department ?? ""] ?? "Managed workflow"}</p>
                  <h2 className="mt-1 font-display text-2xl">{client.name}</h2>
                  <p className="mt-2 text-sm text-faint">
                    {client.primary_contact_name || "Primary contact not recorded"}
                    {client.primary_contact_email ? ` · ${client.primary_contact_email}` : ""}
                  </p>
                </div>
                <span className="badge">{client.engagement_status ?? client.service_status}</span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-px border border-rule bg-rule text-sm">
                <Metric label="Active logins" value={client.activeAccess} />
                <Metric label="Pending invites" value={client.pendingInvites} />
              </dl>
              <Link href={`/ops/client/${client.id}/access`} className="btn-primary mt-5 w-full text-center">
                Manage Client Portal access
              </Link>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <article className="bg-card p-5"><p className="eyebrow">{label}</p><strong className="mt-2 block font-display text-4xl">{value}</strong></article>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="bg-paper p-3"><dt className="text-xs uppercase tracking-wider text-faint">{label}</dt><dd className="mt-1 font-display text-2xl">{value}</dd></div>;
}
