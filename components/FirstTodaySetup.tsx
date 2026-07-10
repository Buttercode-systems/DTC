import type { ReactNode } from "react";
import Link from "next/link";
import { createInvoice, createLead, createQuote } from "@/app/app/actions";
import { isoDate } from "@/lib/format";

export function FirstTodaySetup({ quoteFollowupDays }: { quoteFollowupDays: number }) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    <section className="bg-card shadow-card p-5 md:p-6 border-l-4 border-ledger">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow mb-2">First Today list</p>
          <h2 className="font-display text-2xl leading-none">Start by tracking one real thing that can cost you money.</h2>
          <p className="mt-3 text-sm text-faint leading-relaxed">
            DueToday is only useful when it has something real to watch. Add one open lead, old quote, or overdue invoice below — the engine will turn it into an action due today.
          </p>
        </div>
        <Link href="/app/pipeline" className="font-mono text-xs text-ledger font-semibold hover:underline">
          See pipeline →
        </Link>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <QuickStartCard
          number="01"
          title="Reply to one lead"
          description="Use this when someone asked for a price, callback, booking, quote, or availability and nobody has replied yet."
        >
          <form action={createLead} className="mt-4 space-y-2">
            <input name="customer_name" required className="field" placeholder="Lead name" />
            <input name="phone" className="field" placeholder="WhatsApp / phone" />
            <input name="source" className="field" placeholder="Source: WhatsApp, call, Facebook…" />
            <input name="notes" className="field" placeholder="What do they want?" />
            <button className="btn-primary w-full !py-2 text-sm">Add lead to Today</button>
          </form>
        </QuickStartCard>

        <QuickStartCard
          number="02"
          title="Chase one quote"
          description={`Use this for a quote older than ${quoteFollowupDays} day${quoteFollowupDays === 1 ? "" : "s"} that still has no decision.`}
        >
          <form action={createQuote} className="mt-4 space-y-2">
            <input name="number" required className="field" placeholder="Quote number" />
            <input name="amount" type="number" min="0" step="0.01" className="field" placeholder="Amount (R)" />
            <input name="description" className="field" placeholder="Customer / job description" />
            <input type="hidden" name="sent_days_ago" value={Math.max(quoteFollowupDays, 1)} />
            <button className="btn-primary w-full !py-2 text-sm">Add quote follow-up</button>
          </form>
        </QuickStartCard>

        <QuickStartCard
          number="03"
          title="Chase one invoice"
          description="Use this for money already owed. Add the invoice and DueToday will keep bringing it back until it is paid."
        >
          <form action={createInvoice} className="mt-4 space-y-2">
            <input type="hidden" name="kind" value="customer" />
            <input name="number" required className="field" placeholder="Invoice number" />
            <input name="amount" type="number" min="0" step="0.01" className="field" placeholder="Amount (R)" />
            <input name="description" className="field" placeholder="Customer / job description" />
            <label className="block text-xs text-faint">
              Due date
              <input name="due_date" type="date" defaultValue={isoDate(yesterday)} className="field mt-1" />
            </label>
            <button className="btn-primary w-full !py-2 text-sm">Add invoice chase</button>
          </form>
        </QuickStartCard>
      </div>

      <p className="mt-4 font-mono text-[11px] text-faint">
        Not ready to add data? Start from the full <Link href="/app/leads" className="text-ledger font-semibold hover:underline">Leads</Link>, <Link href="/app/quotes" className="text-ledger font-semibold hover:underline">Quotes</Link>, or <Link href="/app/invoices" className="text-ledger font-semibold hover:underline">Invoices</Link> pages.
      </p>
    </section>
  );
}

function QuickStartCard({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="border border-rule bg-paper/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-ledger font-semibold">{number}</p>
          <h3 className="mt-1 font-semibold text-sm">{title}</h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint border border-rule px-1.5 py-0.5">
          Quick
        </span>
      </div>
      <p className="mt-2 text-xs text-faint leading-relaxed">{description}</p>
      {children}
    </article>
  );
}
