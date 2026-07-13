import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/operator";
import {
  ClientAccessSection,
  type ClientInvitation,
  type ClientMembership,
} from "./ClientAccessSection";

export const dynamic = "force-dynamic";
export const metadata = { title: "Client Access — The Admin Department" };

type Workflow = {
  business: {
    id: string;
    name: string;
    industry: string | null;
    service_status: string;
  };
  engagement: {
    department: string;
    service_level: string;
    status: string;
  };
};

type AccessPayload = {
  memberships: ClientMembership[];
  invitations: ClientInvitation[];
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

export default async function ClientAccessPage({
  params,
}: {
  params: { businessId: string };
}) {
  const { supabase } = await requireOperator();
  const [workflowResult, accessResult, businessResult] = await Promise.all([
    supabase.rpc("get_service_workflow", { p_business_id: params.businessId }),
    supabase.rpc("get_managed_client_access", { p_business_id: params.businessId }),
    supabase
      .from("businesses")
      .select("primary_contact_email, primary_contact_name")
      .eq("id", params.businessId)
      .maybeSingle(),
  ]);

  if (workflowResult.error) {
    if (workflowResult.error.message.includes("not found")) notFound();
    throw new Error(`Could not load managed client: ${workflowResult.error.message}`);
  }
  if (accessResult.error) throw new Error(`Could not load client access: ${accessResult.error.message}`);
  if (businessResult.error) throw new Error(`Could not load client contact: ${businessResult.error.message}`);

  const workflow = workflowResult.data as Workflow;
  const access = (accessResult.data ?? { memberships: [], invitations: [] }) as AccessPayload;
  const contactEmail = businessResult.data?.primary_contact_email ?? "";

  return (
    <div className="space-y-8">
      <section className="grid gap-6 border-b border-rule pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/ops/access" className="font-semibold text-ledger hover:underline">
              ← Client access
            </Link>
            <Link href={`/ops/client/${params.businessId}`} className="font-semibold text-ledger hover:underline">
              Open workflow
            </Link>
          </div>
          <p className="eyebrow mt-5">{DEPARTMENTS[workflow.engagement.department] ?? workflow.engagement.department}</p>
          <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
            {workflow.business.name}
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-faint">
            Create the client’s private portal invitation, confirm who has access and remove access immediately when the service changes or ends.
          </p>
        </div>
        <div className="border border-rule bg-card px-4 py-3 text-sm">
          <p className="font-semibold">{businessResult.data?.primary_contact_name || "Primary contact"}</p>
          <p className="mt-1 text-faint">{contactEmail || "No contact email recorded"}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
            {workflow.engagement.service_level} · {workflow.engagement.status}
          </p>
        </div>
      </section>

      <ClientAccessSection
        businessId={params.businessId}
        defaultEmail={contactEmail}
        memberships={access.memberships ?? []}
        invitations={access.invitations ?? []}
      />
    </div>
  );
}
