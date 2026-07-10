import { requireBusiness } from "@/lib/db";
import { createQuote, setQuoteStatus } from "@/app/app/actions";
import { agoDays, money, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quotes — DueToday" };

export default async function QuotesPage() {
  const { supabase, business } = await requireBusiness();
  const [quotesRes, customersRes] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, number, description, amount, status, sent_at, valid_until, last_followup_at, customers(name)")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("customers")
      .select("id, name")
      .eq("business_id", business.id)
      .order("name"),
  ]);
  // A failed query must not render as an empty quote book.
  if (quotesRes.error) throw new Error(`Could not load quotes: ${quotesRes.error.message}`);
  if (customersRes.error) throw new Error(`Could not load customers: ${customersRes.error.message}`);
  const { data: quotes } = quotesRes;
  const { data: customers } = customersRes;

  const open = (quotes ?? []).filter((q) => q.status === "sent");
  const closed = (quotes ?? []).filter((q) => q.status !== "sent");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="font-display text-2xl">Quotes</h1>
        <p className="text-sm text-faint mt-1">
          Every open quote is followed on schedule until it&apos;s won or closed
          — nothing ages silently.
        </p>

        <h2 className="eyebrow mt-6 mb-2">Open ({open.length})</h2>
        <ul className="bg-card shadow-card ruled">
          {open.length === 0 && (
            <li className="p-6 text-sm text-faint">
              No open quotes. Add every quote older than 7 days first.
            </li>
          )}
          {open.map((q) => {
            const customer = Array.isArray(q.customers) ? q.customers[0] : q.customers;
            return (
              <li key={q.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">
                      #{q.number} — {customer?.name ?? "No customer"} ·{" "}
                      <span className="font-mono">{money(q.amount)}</span>
                    </p>
                    <p className="font-mono text-xs text-faint mt-0.5">
                      sent {agoDays(q.sent_at)} ago · valid until{" "}
                      {shortDate(q.valid_until)} · last follow-up{" "}
                      {q.last_followup_at ? agoDays(q.last_followup_at) + " ago" : "never"}
                    </p>
                  </div>
                  {/* Opposite-outcome actions: 44px targets, spaced apart */}
                  <div className="flex gap-3">
                    <form action={setQuoteStatus.bind(null, q.id, "accepted")}>
                      <button className="inline-flex items-center min-h-11 font-mono text-xs border border-ledger text-ledger px-3 hover:bg-ledger-tint">
                        Won
                      </button>
                    </form>
                    <form action={setQuoteStatus.bind(null, q.id, "declined")}>
                      <button className="inline-flex items-center min-h-11 font-mono text-xs border border-rule text-faint px-3 hover:border-stuck hover:text-stuck">
                        Lost
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {closed.length > 0 && (
          <>
            <h2 className="eyebrow mt-6 mb-2">Decided</h2>
            <ul className="bg-card shadow-card ruled">
              {closed.map((q) => {
                const customer = Array.isArray(q.customers) ? q.customers[0] : q.customers;
                return (
                  <li key={q.id} className="p-3 flex justify-between gap-2 text-sm text-faint">
                    <span>#{q.number} — {customer?.name ?? "—"}</span>
                    <span className="font-mono text-xs uppercase">{q.status}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <aside>
        <div className="bg-card shadow-card p-4 lg:sticky lg:top-28">
          <h2 className="font-semibold text-sm">New quote</h2>
          <form action={createQuote} className="mt-3 space-y-2">
            <input name="number" required className="field" placeholder="Quote number" />
            <select name="customer_id" className="field" defaultValue="">
              <option value="">Customer…</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input name="amount" type="number" step="0.01" min="0" className="field" placeholder="Amount (R)" />
            <input name="description" className="field" placeholder="What's it for?" />
            <label className="block text-xs text-faint">
              Sent how many days ago?
              <input name="sent_days_ago" type="number" min="0" max="365" defaultValue="0" className="field mt-1" />
            </label>
            <button className="btn-primary w-full !py-2 text-sm">Add quote</button>
            <p className="font-mono text-[11px] text-faint">
              Follow-ups start automatically after {business.settings.quote_followup_days} days.
            </p>
          </form>
        </div>
      </aside>
    </div>
  );
}
