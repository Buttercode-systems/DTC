"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signUp, type AuthState } from "./actions";

export function SignUpForm({ assessmentToken }: { assessmentToken: string }) {
  const [state, action] = useFormState<AuthState, FormData>(signUp, {});
  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="assessment" value={assessmentToken} />
      <input name="business_name" required className="field" placeholder="Business name" />
      <input name="email" type="email" required className="field" placeholder="Email" />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        className="field"
        placeholder="Password (8+ characters)"
      />
      {state.error && <p className="text-stuck text-sm">{state.error}</p>}
      {state.notice && (
        <p className="text-ledger text-sm bg-ledger-tint border border-ledger/30 p-3">
          {state.notice}
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
      {pending ? "Setting up…" : "Create my Today list"}
    </button>
  );
}
