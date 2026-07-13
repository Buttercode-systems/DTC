import Link from "next/link";
import { requireOperator } from "@/lib/operator";
import {
  createClientInvitation,
  deactivateClientAccess,
  revokeClientInvitation,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Client Access — The Admin Department" };

type AccessPayload = {
  memberships: Array<{
    user_id: string;
    email: string;
    role: string;
    active: boolean;
    created_at: string;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    expires_at: string;
    created_at: string;
    claimed_at: string | null;
    revoked_at: string | null;
  }>;
};

export default async function ClientAccessPage({
  params,
  searchParams,
}: {
  params: { businessId: string };
  searchParams: { invite?: string };
}) {
  const { supabase } = await requireOperator();
  const [{ data, error }, businessResult] = await Promise.all([
    supabase.rpc("get_managed_client_access", { p_business_id: params.businessId }),
    supabase.from("businesses").select("id,name").eq("id", params.businessId).maybeSingle(),
  ]);
  if (error) throw new Error(`Could not load client access: ${error.message}`);
  if (businessResult.error || !businessResult.data) throw new Error("Managed business not found.");
  const access = (data ?? { memberships: [], invitations: [] }) as AccessPayload;
  const invitationUrl = searchParams.invite
    ? `https://due-today-six.vercel.app/invite/${encodeURIComponent(searchParams.invite)}`
    : null;

  return (
    <div className="space-y-8">
      <section className="border-b border-rule pb-7">
        <Link href={`/ops/client/${params.businessId}`} className="font-mono text-xs text-ledger hover:underline">
          ← Managed workspace
        </Link>
        <p className="eyebrow mt-5">Client Portal access</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">{businessResult.data.name}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-faint">
          Invite the exact client email that will sign in. Links expire after seven days and can be revoked before claim.
        </p>
      </section>

      {invitationUrl && (
        <section className="border border-ledger bg-ledger/5 p-5">
          <p className="eyebrow">Invitation ready</p>
          <h2 className="mt-2 font-display text-2xl">Send this private link to the client.</h2>
          <input readOnly value={invitationUrl} className="field mt-4 font-mono text-xs" aria-label="Client invitation link" />
          <p className="mt-2 text-xs text-faint">The link works only for the invited email and only once.</p>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form action={createClientInvitation} className="space-y-4 border border-rule bg-card p-5">
          <input type="hidden" name="business_id" value={params.businessId} />
          <div>
            <p className="eyebrow">New invitation</p>
            <h2 className="mt-1 font-display text-2xl">Grant portal access</h2>
          </div>
          <label className="block text-sm font-semibold">
            Client email
            <input name="email" type="email" required maxLength={320} className="field mt-1" />
          </label>
          <label className="block text-sm font-semibold">
            Role
            <select name="role" defaultValue="owner" className="field mt-1">
              <option value="owner">Owner — decisions and reports</option>
              <option value="manager">Manager — decisions and reports</option>
              <option value="viewer">Viewer — read-only portal</option>
            </select>
          </label>
          <button className="btn-primary w-full">Create invitation</button>
        </form>

        <div className="space-y-6">
          <section className="border border-rule bg-card p-5">
            <p className="eyebrow">Active and previous access</p>
            <h2 className="mt-1 font-display text-2xl">Client accounts</h2>
            <div className="mt-4 space-y-3">
              {access.memberships.length === 0 ? (
                <p className="text-sm text-faint">No client has claimed access yet.</p>
              ) : access.memberships.map((member) => (
                <article key={member.user_id} className="flex flex-col gap-3 border-t border-rule pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{member.email}</p>
                    <p className="text-xs text-faint">{member.role} · {member.active ? "active" : "inactive"}</p>
                  </div>
                  {member.active && (
                    <form action={deactivateClientAccess}>
                      <input type="hidden" name="business_id" value={params.businessId} />
                      <input type="hidden" name="user_id" value={member.user_id} />
                      <button className="btn-secondary">Deactivate</button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="border border-rule bg-card p-5">
            <p className="eyebrow">Invitation history</p>
            <div className="mt-4 space-y-3">
              {access.invitations.length === 0 ? (
                <p className="text-sm text-faint">No invitations created.</p>
              ) : access.invitations.map((invitation) => (
                <article key={invitation.id} className="flex flex-col gap-3 border-t border-rule pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{invitation.email}</p>
                    <p className="text-xs text-faint">{invitation.role} · {invitation.status} · expires {formatDate(invitation.expires_at)}</p>
                  </div>
                  {invitation.status === "pending" && (
                    <form action={revokeClientInvitation}>
                      <input type="hidden" name="business_id" value={params.businessId} />
                      <input type="hidden" name="invitation_id" value={invitation.id} />
                      <button className="btn-secondary">Revoke</button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
