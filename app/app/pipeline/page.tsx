import Link from "next/link";
import { requireBusiness } from "@/lib/db";
import { daysOverdue, money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pipeline — DueToday" };

export default async function PipelinePage() {
  const { supabase, business } = await requireBusiness();
  const [leadsResult, quotesResult, invoicesResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id, status")
      .eq("business_id", business.id)
      .in("status", ["new", "responded"]),
    supabase
      .from("quotes")
      .select("id, amount, status, last_followup_at")
      .eq("business_id", business.id)
      .eq("status", "sent"),
    supabase
      .from("invoices")
      .select("id, amount, status, due_date, kind")
      .eq("business_id", business.id)
      .eq("kind", "customer")
      .eq("status", "sent"),
  ]);

  if (leadsResult.error) throw new Error(`Could not load pipeline leads: ${leadsResult.error.message}`);
  if (quotesResult.error) throw new Error(`Could not load pipeline quotes: ${quotesResult.error.message}`);
  if (invoicesResult.error) throw new Error(`Could not load pipeline invoices: ${invoicesResult.error.message}`);

  const leads = leadsResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const newLeads = leads.filter((lead) => lead.status === "new");
  const responded = leads.filter((lead) => lead.status === "responded");
  const needFollow = quotes.filter((quote) => !quote.last_followup_at);
  const overdue = invoices.filter((invoice) => daysOverdue(invoice.due_date) > 0);
  const current = invoices.filter((invoice) => daysOverdue(invoice.due_date) <= 0);

  const sum = (items: { amount: number }[]) =>
    items.reduce((total, item) => total + Number(item.amount), 0);

  const stages = [
    {
      label: "New leads",
      sub: "Waiting for a first response",
      count: newLeads.length,
      value: null as string | null,
      href: "/app/leads",
      hot: newLeads.length > 0,
    },
    {
      label: "In conversation",
      sub: "Responded to, but not yet quoted",
      count: responded.length,
      value: null,
      href: "/app/leads",
      hot: false,
    },
    {
      label: "Quotes awaiting a decision",
      sub: needFollow.length === 0 ? "Every open quote has follow-up history" : `${needFollow.length} have never been followed up`,
      count: quotes.length,
      value: money(sum(quotes)),
      href: "/app/quotes",
      hot: needFollow.length > 0,
    },
    {
      label: "Invoices not yet due",
      sub: "Issued and still within payment terms",
      count: current.length,
      value: money(sum(current)),
      href: "/app/invoices",
      hot: false,
    },
    {
      label: "Overdue invoices",
      sub: "Earned revenue still waiting for payment",
      count: overdue.length,
      value: money(sum(overdue)),
      href: "/app/invoices",
      hot: overdue.length > 0,
    },
  ];

  const hasPipelineWork = stages.some((stage) => stage.count > 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Revenue movement</p>
          <h1 className="mt-1 font-display text-3xl">Pipeline</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-faint">
            See where active opportunities and customer money are waiting, from first enquiry to payment.
          </p>
        </div>
        <Link href="/app" className="btn-secondary">Open Today</Link>
      </div>

      {!hasPipelineWork && (
        <section className="mt-6 border border-dashed border-rule bg-card p-6">
          <h2 className="font-display text-xl">Nothing is currently waiting in the pipeline.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-faint">
            Capture a real lead, quote or customer invoice. DueToday will place it in the correct stage and surface the next action when attention is required.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/app/leads" className="btn-primary">Capture a lead</Link>
            <Link href="/app/import" className="btn-secondary">Import existing work</Link>
          </div>
        </section>
      )}

      <div className="mt-6 space-y-3">
        {stages.map((stage, index) => (
          <Link
            key={stage.label}
            href={stage.href}
            className={`block bg-card shadow-card p-4 transition-transform hover:translate-x-1 ${
              stage.hot ? "border-l-4 border-stuck" : "border-l-4 border-transparent"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <span className="shrink-0 font-mono text-xs text-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{stage.label}</p>
                  <p className="truncate font-mono text-xs text-faint">{stage.sub}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-xl">{stage.count}</p>
                {stage.value && <p className="font-mono text-xs text-faint">{stage.value}</p>}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-4 font-mono text-xs text-faint">
        Records that need attention generate actions on Today. Complete the action, record the outcome and keep the next commitment visible.
      </p>
    </div>
  );
}
