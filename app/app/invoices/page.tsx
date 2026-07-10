import { requireBusiness } from "@/lib/db";
import { createInvoice, markInvoicePaid, recordPromise } from "@/app/app/actions";
import { daysOverdue, money, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices — DueToday" };

export default async function InvoicesPage() {
  const { supabase, business } = await requireBusiness();
  const [invoicesRes, customersRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, number, kind, counterparty, description, amount, status, due_date, recurring_interval, customers(name)")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("customers")
      .select("id, name")
      .eq("business_id", business.id)
      .order("name"),
  ]);
  // A failed query must not render as "Nothing here." on a money page.
  if (invoicesRes.error) throw new Error(`Could not load invoices: ${invoicesRes.error.message}`);
  if (customersRes.error) throw new Error(`Could not load customers: ${customersRes.error.message}`);
  const { data: invoices } = invoicesRes;
  const { data: customers } = customersRes;

  const all = invoices ?? [];
  const overdue = all.filter(
    (i) => i.kind === "customer" && i.status === "sent" && daysOverdue(i.due_date) > 0
  );
  const outstanding = all.filter(
    (i) => i.kind === "customer" && i.status === "sent" && daysOverdue(i.due_date) <= 0
  );
  const suppliers = all.filter((i) => i.kind === "supplier" && i.status === "sent");
  const settled = all.filter((i) => ["paid", "approved", "void"].includes(i.status));

  const overdueTotal = overdue.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-2xl">Invoices</h1>
          {overdue.length > 0 && (
            <p className="font-mono text-sm text-stuck font-semibold">
              {money(overdueTotal)} overdue across {overdue.length}
            </p>
          )}
        </div>

        <Group title={`Overdue (${overdue.length})`} tone="stuck" items={overdue} customers />
        <Group title={`Outstanding (${outstanding.length})`} items={outstanding} customers />
        <Group title={`Supplier — awaiting approval (${suppliers.length})`} items={suppliers} />
        {settled.length > 0 && (
          <>
            <h2 className="eyebrow mt-6 mb-2">Settled</h2>
            <ul className="bg-card shadow-card ruled">
              {settled.slice(0, 20).map((i) => (
                <li key={i.id} className="p-3 flex justify-between gap-2 text-sm text-faint">
                  <span>#{i.number} — {name(i)}</span>
                  <span className="font-mono text-xs uppercase">{i.status}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <aside>
        <div className="bg-card shadow-card p-4 lg:sticky lg:top-28">
          <h2 className="font-semibold text-sm">New invoice</h2>
          <form action={createInvoice} className="mt-3 space-y-2">
            <select name="kind" className="field">
              <option value="customer">Customer invoice (money in)</option>
              <option value="supplier">Supplier invoice (to approve)</option>
            </select>
            <input name="number" required className="field" placeholder="Invoice number" />
            <select name="customer_id" className="field" defaultValue="">
              <option value="">Customer (if customer invoice)…</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input name="counterparty" className="field" placeholder="Supplier name (if supplier)" />
            <input name="amount" type="number" step="0.01" min="0" className="field" placeholder="Amount (R)" />
            <label className="block text-xs text-faint">
              Due date
              <input name="due_date" type="date" className="field mt-1" />
            </label>
            <label className="flex items-center gap-2 text-xs text-faint">
              <input type="checkbox" name="recurring" value="monthly" className="accent-[#0E5C46]" />
              Recurring monthly (re-issues itself on schedule)
            </label>
            <button className="btn-primary w-full !py-2 text-sm">Add invoice</button>
          </form>
        </div>
      </aside>
    </div>
  );
}

function name(i: { customers?: unknown; counterparty?: string | null }): string {
  const c = Array.isArray(i.customers) ? i.customers[0] : i.customers;
  return (c as { name?: string } | null)?.name ?? i.counterparty ?? "—";
}

function Group({
  title,
  items,
  tone,
  customers = false,
}: {
  title: string;
  items: {
    id: string;
    number: string;
    kind: string;
    amount: number;
    due_date: string | null;
    recurring_interval: string | null;
    customers?: unknown;
    counterparty?: string | null;
  }[];
  tone?: "stuck";
  customers?: boolean;
}) {
  return (
    <>
      <h2 className={`eyebrow mt-6 mb-2 ${tone === "stuck" ? "!text-stuck" : ""}`}>
        {title}
      </h2>
      <ul className={`bg-card shadow-card ruled ${tone === "stuck" ? "border-l-4 border-stuck" : ""}`}>
        {items.length === 0 && (
          <li className="p-4 text-sm text-faint">Nothing here.</li>
        )}
        {items.map((i) => {
          const od = daysOverdue(i.due_date);
          return (
            <li key={i.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">
                    #{i.number} — {name(i)} ·{" "}
                    <span className="font-mono">{money(i.amount)}</span>
                    {i.recurring_interval && (
                      <span className="font-mono text-xs text-ledger ml-2">↻ monthly</span>
                    )}
                  </p>
                  <p className="font-mono text-xs text-faint mt-0.5">
                    due {shortDate(i.due_date)}
                    {od > 0 && (
                      <span className="text-stuck font-semibold"> · {od} days overdue</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {customers && (
                    <details className="relative">
                      <summary className="inline-flex items-center min-h-11 font-mono text-xs border border-rule px-3 cursor-pointer list-none hover:border-ink">
                        Promise…
                      </summary>
                      <form
                        action={recordPromise}
                        className="absolute right-0 z-10 mt-1 w-56 bg-card border border-rule p-3 space-y-2 shadow-card"
                      >
                        <input type="hidden" name="invoice_id" value={i.id} />
                        <label className="block text-xs text-faint">
                          Promised to pay by
                          <input name="promised_date" type="date" required className="field mt-1" />
                        </label>
                        <input name="note" className="field" placeholder="Note (optional)" />
                        <button className="btn-primary w-full !py-1.5 text-xs">
                          Log promise
                        </button>
                        <p className="font-mono text-[10px] text-faint">
                          It resurfaces on Today the day it falls due.
                        </p>
                      </form>
                    </details>
                  )}
                  <form action={markInvoicePaid.bind(null, i.id)}>
                    <button className="inline-flex items-center min-h-11 font-mono text-xs border border-ledger text-ledger px-3 hover:bg-ledger-tint">
                      {i.kind === "supplier" ? "Approved" : "Paid"}
                    </button>
                  </form>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
