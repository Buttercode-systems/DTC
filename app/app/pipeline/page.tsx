import Link from "next/link";
import { requireBusiness } from "@/lib/db";
import { daysOverdue, money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pipeline — DueToday" };

export default async function PipelinePage() {
  const { supabase, business } = await requireBusiness();
  const [{ data: leads }, { data: quotes }, { data: invoices }] =
    await Promise.all([
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

  const newLeads = (leads ?? []).filter((l) => l.status === "new");
  const responded = (leads ?? []).filter((l) => l.status === "responded");
  const openQuotes = quotes ?? [];
  const needFollow = openQuotes.filter((q) => !q.last_followup_at);
  const inv = invoices ?? [];
  const overdue = inv.filter((i) => daysOverdue(i.due_date) > 0);
  const current = inv.filter((i) => daysOverdue(i.due_date) <= 0);

  const sum = (xs: { amount: number }[]) =>
    xs.reduce((s, x) => s + Number(x.amount), 0);

  const stages = [
    {
      label: "New leads",
      sub: "waiting for a first reply",
      count: newLeads.length,
      value: null as string | null,
      href: "/app/leads",
      hot: newLeads.length > 0,
    },
    {
      label: "In conversation",
      sub: "responded, not yet quoted",
      count: responded.length,
      value: null,
      href: "/app/leads",
      hot: false,
    },
    {
      label: "Quotes out",
      sub: `${needFollow.length} never followed up`,
      count: openQuotes.length,
      value: money(sum(openQuotes)),
      href: "/app/quotes",
      hot: needFollow.length > 0,
    },
    {
      label: "Invoiced, not yet due",
      sub: "keep an eye on these",
      count: current.length,
      value: money(sum(current)),
      href: "/app/invoices",
      hot: false,
    },
    {
      label: "Overdue",
      sub: "money already earned, not collected",
      count: overdue.length,
      value: money(sum(overdue)),
      href: "/app/invoices",
      hot: overdue.length > 0,
    },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl">Pipeline</h1>
      <p className="text-sm text-faint mt-1">
        Where every rand currently sits — from first enquiry to money in the bank.
      </p>
      <div className="mt-6 space-y-3">
        {stages.map((s, i) => (
          <Link
            key={s.label}
            href={s.href}
            className={`block bg-card shadow-card p-4 hover:translate-x-1 transition-transform ${
              s.hot ? "border-l-4 border-stuck" : "border-l-4 border-transparent"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-mono text-xs text-faint shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{s.label}</p>
                  <p className="font-mono text-xs text-faint truncate">{s.sub}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-xl">{s.count}</p>
                {s.value && (
                  <p className="font-mono text-xs text-faint">{s.value}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-4 font-mono text-xs text-faint">
        Everything stuck in a stage generates its own action on Today. Clear the
        list and the pipeline moves.
      </p>
    </div>
  );
}
