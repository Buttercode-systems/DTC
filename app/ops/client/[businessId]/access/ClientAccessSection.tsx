"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createClientInvitation,
  deactivateClientAccess,
  revokeClientInvitation,
  type InvitationState,
} from "./actions";

export type ClientMembership = {
  user_id: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
};

export type ClientInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  claimed_at: string | null;
  revoked_at: string | null;
};

export function ClientAccessSection({
  businessId,
  defaultEmail,
  memberships,
  invitations,
}: {
  businessId: string;
  defaultEmail: string;
  memberships: ClientMembership[];
  invitations: ClientInvitation[];
}) {
  const [state, action] = useFormState<InvitationState, FormData>(
    createClientInvitation,
    {}
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-6 border border-rule bg-card p-5 shadow-card lg:grid-cols-[1fr_24rem] lg:p-6">
        <div>
          <p className="eyebrow">Client Portal invitation</p>
          <h2 className="mt-2 font-display text-3xl">Give the client controlled access</h2>
          <p className="mt-3 max-w-2xl leading-7 text-faint">
            The invitation is locked to the exact email address below. The client must sign in or create an account with that same email before the workspace can be claimed.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-faint">
            <li>• The system emails the private link and also shows it once for manual delivery.</li>
            <li>• Owner and manager roles can approve decisions and respond to reports.</li>
            <li>• Viewer access is read-only.</li>
            <li>• Links expire after seven days and can be revoked immediately.</li>
          </ul>
        </div>

        <form action={action} className="grid gap-3 border border-rule bg-paper p-4">
          <input type="hidden" name="business_id" value={businessId} />
          <label className="text-sm font-semibold">
            Client email
            <input
              className="field mt-1"
              type="email"
              name="email"
              required
              defaultValue={defaultEmail}
            />
          </label>
          <label className="text-sm font-semibold">
            Portal role
            <select className="field mt-1" name="role" defaultValue="owner">
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          {state.error && <p className="text-sm text-stuck">{state.error}</p>}
          <CreateButton />
        </form>
      </section>

      {state.invitationUrl && (
        <section
          className={`border p-5 ${
            state.delivery === "sent"
              ? "border-ledger/40 bg-ledger/5"
              : "border-slowing/40 bg-slowing/10"
          }`}
          aria-live="polite"
        >
          <p className="eyebrow">
            {state.delivery === "sent" ? "Invitation emailed" : "Manual delivery required"}
          </p>
          <h2 className="mt-2 font-display text-2xl">
            {state.delivery === "sent"
              ? `Client Portal invitation sent to ${state.email}`
              : `Send this private link to ${state.email}`}
          </h2>
          {state.notice && <p className="mt-2 text-sm font-semibold">{state.notice}</p>}
          <p className="mt-2 text-sm text-faint">
            Expires {state.expiresAt ? formatDate(state.expiresAt) : "in seven days"}. The full link is shown once; creating another invitation revokes the previous pending link.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              className="field flex-1 font-mono text-xs"
              readOnly
              value={state.invitationUrl}
              aria-label="Client Portal invitation link"
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigator.clipboard.writeText(state.invitationUrl ?? "")}
            >
              Copy link
            </button>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Active client access</p>
          <h2 className="mt-1 font-display text-3xl">People who can open this portal</h2>
        </div>
        {memberships.length === 0 ? (
          <Empty text="No client has claimed access yet." />
        ) : (
          <div className="space-y-3">
            {memberships.map((membership) => (
              <article key={membership.user_id} className="flex flex-col gap-4 border border-rule bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{membership.email}</p>
                  <p className="mt-1 text-sm text-faint">
                    {membership.role} · {membership.active ? "Active" : "Inactive"}
                  </p>
                </div>
                {membership.active && (
                  <form action={deactivateClientAccess}>
                    <input type="hidden" name="business_id" value={businessId} />
                    <input type="hidden" name="user_id" value={membership.user_id} />
                    <button className="btn-secondary !px-3 !py-2 text-sm">Deactivate access</button>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Invitation history</p>
          <h2 className="mt-1 font-display text-3xl">Pending and previous links</h2>
        </div>
        {invitations.length === 0 ? (
          <Empty text="No invitation has been created for this client." />
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <article key={invitation.id} className="grid gap-4 border border-rule bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{invitation.email}</strong>
                    <span className="badge">{invitation.role}</span>
                    <span className={`badge ${invitation.status === "claimed" ? "badge-good" : invitation.status === "pending" ? "badge-warn" : ""}`}>
                      {invitation.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-faint">
                    Created {formatDate(invitation.created_at)} · Expires {formatDate(invitation.expires_at)}
                  </p>
                </div>
                {invitation.status === "pending" && (
                  <form action={revokeClientInvitation}>
                    <input type="hidden" name="business_id" value={businessId} />
                    <input type="hidden" name="invitation_id" value={invitation.id} />
                    <button className="btn-secondary !px-3 !py-2 text-sm">Revoke link</button>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Creating and sending…" : "Create and email Client Portal invitation"}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="border border-dashed border-rule bg-card/40 p-6 text-center text-faint">{text}</div>;
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-ZA", {
      timeZone: "Africa/Johannesburg",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
