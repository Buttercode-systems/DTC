"use client";

import { useMemo, useState } from "react";
import { importMoneyItems } from "@/app/app/actions";
import { importExample, parseImportText, type ImportKind } from "@/lib/import-money";
import { money } from "@/lib/format";

export function ImportWorkbench({ initialKind = "quotes" }: { initialKind?: ImportKind }) {
  const [kind, setKind] = useState<ImportKind>(initialKind);
  const [text, setText] = useState(importExample(initialKind));
  const rows = useMemo(() => parseImportText(text, kind), [text, kind]);
  const valid = rows.filter((row) => row.errors.length === 0);
  const total = valid.reduce((sum, row) => sum + row.amount, 0);

  function switchKind(next: ImportKind) {
    setKind(next);
    setText(importExample(next));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchKind("quotes")}
          className={kind === "quotes" ? "btn-primary !py-2 text-sm" : "btn-secondary !py-2 text-sm"}
        >
          Open quotes
        </button>
        <button
          type="button"
          onClick={() => switchKind("invoices")}
          className={kind === "invoices" ? "btn-primary !py-2 text-sm" : "btn-secondary !py-2 text-sm"}
        >
          Overdue invoices
        </button>
      </div>

      <form action={importMoneyItems} className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <input type="hidden" name="kind" value={kind} />
        <section className="bg-card shadow-card p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="eyebrow mb-1">Paste or CSV import</p>
              <h2 className="font-display text-2xl">
                {kind === "quotes" ? "Import open quotes" : "Import unpaid invoices"}
              </h2>
            </div>
            <p className="font-mono text-xs text-faint">Header row supported · CSV or spreadsheet paste</p>
          </div>
          <textarea
            name="import_text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="field mt-4 min-h-[260px] font-mono text-xs leading-relaxed"
            spellCheck={false}
          />
          <p className="mt-3 text-xs text-faint">
            Required columns: {kind === "quotes" ? "number, customer, amount, sent_days_ago or sent_date" : "number, customer, amount, due_date"}. Optional: phone, description.
          </p>
        </section>

        <aside className="space-y-4">
          <div className="bg-card shadow-card p-4">
            <p className="eyebrow mb-2">Preview before saving</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Rows" value={rows.length} />
              <Metric label="Valid" value={valid.length} />
              <Metric label="Value" value={money(total)} />
            </div>
            <button disabled={valid.length === 0} className="btn-primary mt-4 w-full !py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
              Save {valid.length} and create Today actions
            </button>
            <p className="mt-3 font-mono text-[11px] text-faint">
              Saving runs the DueToday engine immediately, so stale quotes and overdue invoices appear on Today.
            </p>
          </div>
        </aside>
      </form>

      <section>
        <p className="eyebrow mb-3">Parsed rows</p>
        <div className="bg-card shadow-card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="font-mono text-[11px] uppercase tracking-wider text-faint border-b border-rule">
              <tr>
                <th className="text-left p-3">Line</th>
                <th className="text-left p-3">Number</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-faint">Paste rows above to preview them here.</td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={`${row.sourceLine}-${row.number}`} className="border-b border-rule last:border-0">
                  <td className="p-3 font-mono text-xs text-faint">{row.sourceLine}</td>
                  <td className="p-3 font-semibold">{row.number || "—"}</td>
                  <td className="p-3">{row.customerName || "—"}</td>
                  <td className="p-3 font-mono">{money(row.amount)}</td>
                  <td className="p-3 font-mono text-xs text-faint">
                    {kind === "quotes" ? row.sentDate ?? `${row.sentDaysAgo ?? "—"} days ago` : row.dueDate ?? "—"}
                  </td>
                  <td className="p-3">
                    {row.errors.length === 0 ? (
                      <span className="font-mono text-xs text-ledger font-semibold">Ready</span>
                    ) : (
                      <span className="font-mono text-xs text-stuck">{row.errors.join(", ")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-rule p-2">
      <p className="font-display text-xl">{value}</p>
      <p className="font-mono text-[10px] text-faint uppercase">{label}</p>
    </div>
  );
}
