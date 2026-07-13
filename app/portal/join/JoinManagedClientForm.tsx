"use client";

import { useFormState, useFormStatus } from "react-dom";
import { joinManagedClient, type JoinState } from "./actions";

export function JoinManagedClientForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [state, action] = useFormState<JoinState, FormData>(joinManagedClient, {});

  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm font-semibold">
        Invited email
        <input className="field mt-1 bg-paper" name="email" type="email" readOnly value={email} />
      </label>
      <label className="block text-sm font-semibold">
        Create passphrase
        <input
          className="field mt-1"
          name="passphrase"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </label>
      {state.error && <p className="border border-stuck/40 bg-stuck/10 p-3 text-sm text-stuck">{state.error}</p>}
      {state.notice && <p className="border border-ledger/40 bg-ledger/5 p-3 text-sm text-ledger">{state.notice}</p>}
      <JoinButton />
    </form>
  );
}

function JoinButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full" disabled={pending}>
      {pending ? "Creating client account…" : "Create Client Portal account"}
    </button>
  );
}
