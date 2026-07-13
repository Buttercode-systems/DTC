import { requireBusiness } from "@/lib/db";
import { createInvitation, revokeInvitation, updateMember } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team — The Admin Department" };

type TeamPayload = {
  members: Array<{
    user_id: string;
    email: string | null;
    role: "owner" | "manager" | "member" | "viewer" | "operator";
    active: boolean;
    created_at: string;
    is_owner: boolean;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: "manager" | "member" | "viewer";
    status: string;
    expires_at: string;
    created_at: string;
  }>;
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: { invite?: string };
}) {
  const { supabase, business } = await requireBusiness();
  const { data, error } = await supabase.rpc("get_workspace_team", {
    p_business_id: business.id,
  });
  if (error) throw new Error(`Could not load team: ${error.message}`);
  const team = data as TeamPayload;
  const inviteUrl = searchParams.invite
    ? `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://due-today-six.vercel.app"}/invite/${encodeURIComponent(searchParams.invite)}`
    : null;

  return (
    <div className="space-y-8">
      <section className="border-b border-rule pb-7">
        <p className="eyebrow">Workspace access</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Team</h1>
        <p className="mt-3 max-w-3xl text-faint leading-7">
          Invite managers, members and viewers. Managers can operate and decide, members can work records, and viewers remain read-only for approvals and reports.
        </p>
      </section>

      {inviteUrl && (
        <section className="border border-ledger/30 bg-ledger-tint p-5">
          <h2 className="font-display text-2xl">Invitation created</h2>
          <p className="mt-2 text-sm text-faint">Send this one-time link to the invited email. It expires after seven days and only that matching signed-in email can accept it.</p>
          <input readOnly value={inviteUrl} className="field mt-4 font-mono text-xs" />
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div>
            <p className="eyebrow">Current access</p>
            <h2 className="mt-1 font-display text-3xl">Members</h2>
          </div>
          {(team.members ?? []).map((member) => (
            <article key={member.user_id} className="border border-rule bg-card p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{member.email ?? "Email unavailable"}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-faint">
                    {member.is_owner ? "Workspace owner" : member.role} · {member.active ? "Active" : "Disabled"}
                  </p>
                </div>
                {member.is_owner ? (
                  <span className="badge badge-good">Owner</span>
                ) : (
                  <form action={updateMember} className="flex flex-wrap gap-2">
                    <input type="hidden" name="user_id" value={member.user_id} />
                    <select name="role" defaultValue={member.role} className="field min-w-32 py-2">
                      <option value="manager">Manager</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <select name="active" defaultValue={String(member.active)} className="field min-w-28 py-2">
                      <option value="true">Active</option>
                      <option value="false">Disabled</option>
                    </select>
                    <button className="btn-secondary">Save</button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-5">
          <section className="border border-rule bg-card p-5">
            <h2 className="font-display text-2xl">Invite a teammate</h2>
            <form action={createInvitation} className="mt-4 space-y-3">
              <label className="block text-sm font-semibold">
                Email
                <input name="email" type="email" required className="field mt-1" />
              </label>
              <label className="block text-sm font-semibold">
                Role
                <select name="role" defaultValue="viewer" className="field mt-1">
                  <option value="manager">Manager</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
              <button className="btn-primary w-full">Create invitation</button>
            </form>
          </section>

          <section className="border border-rule bg-card p-5">
            <h2 className="font-display text-2xl">Pending invitations</h2>
            {(team.invitations ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-faint">No pending invitations.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {team.invitations.map((invitation) => (
                  <div key={invitation.id} className="border-t border-rule pt-3 text-sm">
                    <p className="font-semibold break-all">{invitation.email}</p>
                    <p className="mt-1 text-xs text-faint">{invitation.role} · Expires {new Date(invitation.expires_at).toLocaleDateString("en-ZA")}</p>
                    <form action={revokeInvitation} className="mt-2">
                      <input type="hidden" name="invitation_id" value={invitation.id} />
                      <button className="text-xs font-semibold text-stuck hover:underline">Revoke</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
