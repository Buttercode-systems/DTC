"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  completeAction,
  dismissAction,
  recordActionOutcome,
  snoozeAction,
} from "@/app/app/actions";
import { whatsappLink } from "@/lib/format";
import { actionDraftMessage } from "@/lib/message-drafts";

export interface TodayAction {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  priority: number;
  contact_phone: string | null;
  due_date: string;
  entity_id: string | null;
  entity_table: string | null;
}

const KIND_LABEL: Record<string, string> = {
  lead_response: "Lead",
  quote_followup: "Quote",
  quote_expired: "Quote",
  invoice_chase: "Collect",
  promise_check: "Promise",
  supplier_approval: "Approve",
  recurring_invoice: "Invoice",
  manual_followup: "Follow-up",
  service_setup: "TAD setup",
  system: "Set up",
};

const OUTCOMES = [
  ["contacted", "Contacted — awaiting answer"],
  ["no_answer", "No answer"],
  ["follow_up", "Follow up again"],
  ["won", "Won"],
  ["lost", "Lost"],
  ["paid", "Paid"],
  ["approved", "Approved"],
  ["completed", "Completed"],
  ["not_needed", "Not needed"],
  ["other", "Other outcome"],
] as const;

export function TodayList({
  actions,
  doneToday,
  showTrackingHint = false,
}: {
  actions: TodayAction[];
  doneToday: { id: string; title: string }[];
  showTrackingHint?: boolean;
}) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [outcomeId, setOutcomeId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = actions.filter((action) => !pendingIds.has(action.id));

  function run(id: string, fn: () => Promise<void>) {
    setErrorMessage(null);
    setPendingIds((current) => new Set(current).add(id));
    startTransition(async () => {
      try {
        await fn();
      } catch (error) {
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "The change could not be saved. The action is still open."
        );
      }
    });
  }

  async function copyDraft(action: TodayAction) {
    const draft = actionDraftMessage(action);
    try {
      await navigator.clipboard.writeText(draft);
      setCopiedId(action.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setErrorMessage("The draft could not be copied. Select the text and copy it manually.");
    }
  }

  if (visible.length === 0 && doneToday.length === 0 && pendingIds.size === 0) {
    return (
      <div className="bg-card shadow-card p-8 text-center">
        <p className="font-display text-xl">Nothing is due yet.</p>
        <p className="mt-2 text-faint text-sm max-w-md mx-auto">
          {showTrackingHint
            ? "Use the quick-start cards above to add one real lead, quote, or invoice. Once it is tracked, DueToday will build the first action automatically."
            : "Nothing is due today — which either means everything is moving, or nothing urgent is being tracked yet."}
        </p>
        <p className="mt-3 text-xs text-faint font-mono">
          Full pages:{" "}
          <Link href="/app/leads" className="text-ledger font-semibold hover:underline">
            Leads
          </Link>{" "}
          ·{" "}
          <Link href="/app/quotes" className="text-ledger font-semibold hover:underline">
            Quotes
          </Link>{" "}
          ·{" "}
          <Link href="/app/invoices" className="text-ledger font-semibold hover:underline">
            Invoices
          </Link>{" "}
          ·{" "}
          <Link href="/app/import" className="text-ledger font-semibold hover:underline">
            Import
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div role="alert" className="border border-stuck/40 bg-stuck/10 px-4 py-3 text-sm">
          <strong>Nothing was cleared.</strong>{" "}
          <span>{errorMessage}</span>
        </div>
      )}

      {visible.length > 0 && (
        <ul className="bg-card shadow-card ruled">
          {visible.map((action) => {
            const draft = actionDraftMessage(action);
            const outcomeOpen = outcomeId === action.id;
            return (
              <li key={action.id} className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    aria-label={`Mark done: ${action.title}`}
                    onClick={() => run(action.id, () => completeAction(action.id))}
                    className="group -mx-3 -mb-3 -mt-2.5 h-11 w-11 shrink-0 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-ledger"
                  >
                    <span className="h-5 w-5 border-2 border-ink group-hover:bg-ledger group-hover:border-ledger transition-colors" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-sm leading-snug">{action.title}</p>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-faint border border-rule px-1.5 py-0.5 shrink-0">
                        {KIND_LABEL[action.kind] ?? action.kind}
                      </span>
                    </div>
                    {action.detail && <p className="mt-1 text-sm text-faint">{action.detail}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setOutcomeId(outcomeOpen ? null : action.id)}
                        className="inline-flex items-center min-h-11 -my-2 px-2 -mx-2 text-ledger font-semibold hover:underline"
                      >
                        {outcomeOpen ? "Close outcome" : "Record outcome →"}
                      </button>
                      {action.contact_phone && (
                        <a
                          href={whatsappLink(action.contact_phone, draft)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center min-h-11 -my-2 px-2 -mx-2 text-ledger font-semibold hover:underline"
                        >
                          WhatsApp draft →
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => copyDraft(action)}
                        className="inline-flex items-center min-h-11 -my-2 px-2 -mx-2 text-ledger font-semibold hover:underline"
                      >
                        {copiedId === action.id ? "Copied" : "Copy draft"}
                      </button>
                      {action.contact_phone && (
                        <a
                          href={`tel:${action.contact_phone}`}
                          className="inline-flex items-center min-h-11 -my-2 px-2 -mx-2 text-ledger font-semibold hover:underline"
                        >
                          Call →
                        </a>
                      )}
                      <button
                        onClick={() => run(action.id, () => snoozeAction(action.id, 1))}
                        className="inline-flex items-center min-h-11 -my-2 px-2 -mx-2 text-faint hover:text-ink"
                      >
                        Tomorrow
                      </button>
                      <button
                        onClick={() => run(action.id, () => dismissAction(action.id))}
                        className="inline-flex items-center min-h-11 -my-2 px-2 -mx-2 text-faint hover:text-ink"
                      >
                        Not needed
                      </button>
                    </div>
                  </div>
                </div>

                {outcomeOpen && (
                  <form
                    className="mt-4 ml-8 border border-rule bg-paper p-4 grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      formData.set("action_id", action.id);
                      setOutcomeId(null);
                      run(action.id, () => recordActionOutcome(formData));
                    }}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-semibold">
                        Outcome
                        <select name="outcome_code" className="field mt-1" defaultValue="contacted">
                          {OUTCOMES.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-semibold">
                        Next action date
                        <input name="next_action_date" type="date" className="field mt-1" />
                      </label>
                    </div>
                    <label className="text-sm font-semibold">
                      What happened?
                      <textarea
                        name="outcome_note"
                        rows={2}
                        className="field mt-1 resize-y"
                        placeholder="Example: Spoke to the customer. Decision expected Friday."
                      />
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-faint max-w-md">
                        A next date creates a fresh follow-up action automatically. The completed action keeps this outcome for reporting.
                      </p>
                      <button type="submit" className="btn-primary !py-2 !px-4 text-sm">
                        Save outcome
                      </button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {(doneToday.length > 0 || pendingIds.size > 0) && (
        <div>
          <p className="eyebrow mb-2">Cleared today</p>
          <ul className="ruled border border-rule bg-card/50">
            {actions
              .filter((action) => pendingIds.has(action.id))
              .map((action) => (
                <li key={action.id} className="px-4 py-2.5 flex items-center gap-3 text-sm text-faint">
                  <span className="h-4 w-4 shrink-0 bg-ledger border-2 border-ledger" aria-hidden />
                  <span className="line-through">{action.title}</span>
                </li>
              ))}
            {doneToday.map((done) => (
              <li key={done.id} className="px-4 py-2.5 flex items-center gap-3 text-sm text-faint">
                <span className="h-4 w-4 shrink-0 bg-ledger border-2 border-ledger" aria-hidden />
                <span className="line-through">{done.title}</span>
              </li>
            ))}
          </ul>
          {visible.length === 0 && (
            <p className="mt-4 font-mono text-sm text-ledger">List finished. Go home.</p>
          )}
        </div>
      )}
    </div>
  );
}
