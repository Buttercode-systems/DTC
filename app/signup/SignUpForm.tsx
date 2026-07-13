"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signUp, type AuthState } from "./actions";

export function SignUpForm({
  assessmentToken,
  next,
  initialEmail,
  initialBusiness,
  tadMode,
}: {
  assessmentToken: string;
  next: string;
  initialEmail: string;
  initialBusiness: string;
  tadMode: boolean;
}) {
  const [state, action] = useFormState<AuthState, FormData>(signUp, {});
  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="assessment" value={assessmentToken} />
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="tad_mode" value={tadMode ? "1" : "0"} />
      <input
        name="business_name"
        required
        defaultValue={initialBusiness}
        className="field"
        placeholder={tadMode ? "Business name used in your TAD application" : "Business name"}
      />
      <input
        name="email"
        type="email"
        required
        defaultValue={initialEmail}
        className="field"
        placeholder="Email"
      />
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
      <Submit tadMode={tadMode} />
    </form>
  );
}

function Submit({ tadMode }: { tadMode: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full" disabled={pending}>
      {pending ? "Setting up…" : tadMode ? "Activate Client Portal" : "Create my Today list"}
    </button>
  );
}
