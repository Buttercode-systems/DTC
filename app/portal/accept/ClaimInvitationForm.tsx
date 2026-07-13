"use client";

import { useFormState, useFormStatus } from "react-dom";
import { claimInvitation, type ClaimState } from "./actions";

export function ClaimInvitationForm({ token }: { token: string }) {
  const [state, action] = useFormState<ClaimState, FormData>(claimInvitation, {});
  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p className="mb-3 border border-stuck/40 bg-stuck/10 p-3 text-sm text-stuck">
          {state.error}
        </p>
      )}
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full" disabled={pending}>
      {pending ? "Opening your workspace…" : "Accept invitation and open Client Portal"}
    </button>
  );
}
