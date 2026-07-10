"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { completeAction, dismissAction, snoozeAction } from "@/app/app/actions";
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
  system: "Set up",
};

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
  const [, startTransition] = useTransition();

  const visible = actions.filter((a) => !pendingIds.has(a.id));

  function run(id: string, fn: () => Promise<void>) {
    setPendingIds((s) => new Set(s).add(id));
    startTransition(async () => {
      try {
        await fn();
      } catch {
        // Roll back the optimistic clear so a failed action never shows as done.
        setPendingIds((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
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
      setCopiedId(null);
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
          Full pages: <Link href="/app/leads" className="text-ledger font-semibold hover:underline">Leads</Link>{" · "}
          <Link href="/app/quotes" className="text-ledger font-semibold hover:underline">Quotes</Link>{" · "}
          <Link href="/app/invoices" className="text-ledger font-semibold hover:underline">Invoices</Link>{" · "}
          <Link href="/app/import" className="text-ledger font-semibold hover:underline">Import</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {visible.length > 0 && (
        <ul className="bg-card shadow-card ruled">
          {visible.map((a) => {
            const draft = actionDraftMessage(a);
            return (
              <li key={a.id} className="p-4 flex items-start gap-3">
                {/* 44px hit area around the 20px visual box (WCAG 2.5.8 / iOS HIG) */}
                <button
                  aria-label={`Mark done: ${a.title}`}
                  onClick={() => run(a.id, () => completeAction(a.id))}
                  className="group -mx-3 -mb-3 -mt-2.5 h-11 w-11 shrink-0 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-ledger"
                >
                  <span className="h-5 w-5 border-2 border-ink group-hover:bg-ledger group-hover:border-ledger transition-colors" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-sm leading-snug">{a.title}</p>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-faint border border-rule px-1.5 py-0.5 shrink-0">
                      {KIND_LABEL[a.kind] ?? a.kind}
                    </span>
                  </div>
                  {a.detail && <p className="mt-1 text-sm text-faint">{a.detail}</p>}
                  {/* min-h-11 + negative margins keep the visual density while
                      giving every action a 44px-tall hit area */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
                    {a.contact_phone && (
                      <a
                        href={whatsappLink(a.contact_phone, draft)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center min-h-11 -my-2 px-2 -mx-2 text-ledger font-semibold hover:underline"
                      >
                        WhatsApp draft →
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => copyDraft(a)}
                      className="inline-flex items-center min-h-11 -my-2 px-2 -mx-2 text-ledger font-semibold hover:underline"
                    >
                      {copiedId === a.id ? "Copied" : "Copy draft"}
                    </button>
                    {a.contact_phone && (
                      <a
                        href={`tel:${a.contact_phone}`}
                        className="inline-flex items-center min-h-11 -my-2 px-2 -mx-2 text-ledger font-semibold hover:underline"
                      >
                        Call →
                      </a>
                    )}
                    <button
                      onClick={() => run(a.id, () => snoozeAction(a.id, 1))}
                      className="inline-flex items-center min-h-11 -my-2 px-2 -mx-2 text-faint hover:text-ink"
                    >
                      Tomorrow
                    </button>
                    <button
                      onClick={() => run(a.id, () => dismissAction(a.id))}
                      className="inline-flex items-center min-h-11 -my-2 px-2 -mx-2 text-faint hover:text-ink"
                    >
                      Not needed
                    </button>
                  </div>
                </div>
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
              .filter((a) => pendingIds.has(a.id))
              .map((a) => (
                <li key={a.id} className="px-4 py-2.5 flex items-center gap-3 text-sm text-faint">
                  <span className="h-4 w-4 shrink-0 bg-ledger border-2 border-ledger" aria-hidden />
                  <span className="line-through">{a.title}</span>
                </li>
              ))}
            {doneToday.map((d) => (
              <li key={d.id} className="px-4 py-2.5 flex items-center gap-3 text-sm text-faint">
                <span className="h-4 w-4 shrink-0 bg-ledger border-2 border-ledger" aria-hidden />
                <span className="line-through">{d.title}</span>
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
