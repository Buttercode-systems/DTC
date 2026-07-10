import Link from "next/link";
import { requireBusiness } from "@/lib/db";
import { money } from "@/lib/format";
import { ImportWorkbench } from "@/components/ImportWorkbench";
import type { ImportKind } from "@/lib/import-money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import — DueToday" };

export default async function ImportPage({
  searchParams,
}: {
  searchParams: { type?: string; imported?: string; skipped?: string; amount?: string; error?: string };
}) {
  const { supabase, business } = await requireBusiness();
  const [{ count: quoteCount }, { count: invoiceCount }] = await Promise.all([
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "sent"),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("kind", "customer").eq("status", "sent"),
  ]);

  const kind: ImportKind = searchParams.type === "invoices" ? "invoices" : "quotes";
  const imported = Number(searchParams.imported ?? "");
  const skipped = Number(searchParams.skipped ?? "");
  const amount = Number(searchParams.amount ?? "");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Cycle 11 automation</p>
          <h1 className="font-display text-3xl">Import money items</h1>
          <p className="mt-2 text-faint max-w-2xl">
            Paste open quotes or unpaid invoices from a spreadsheet. DueToday previews the rows, saves valid records, then runs the engine so Today shows what must be chased.
          </p>
        </div>
        <Link href="/app/brief" className="btn-secondary !py-2 text-sm">
          Daily brief →
        </Link>
      </div>

      {Number.isFinite(imported) && searchParams.imported !== undefined && (
        <div className="border border-ledger bg-ledger-tint p-4">
          <p className="font-semibold">
            Imported {imported} {kind === "quotes" ? "quote" : "invoice"}{imported === 1 ? "" : "s"}
            {Number.isFinite(amount) && amount > 0 ? ` · ${money(amount)} tracked` : ""}.
          </p>
          <p className="mt-1 text-sm text-faint">
            {skipped || 0} duplicate or invalid row{skipped === 1 ? "" : "s"} skipped. The Today engine has already run.
          </p>
          <Link href="/app" className="inline-block mt-3 text-sm font-semibold text-ledger hover:underline">
            Open Today list →
          </Link>
        </div>
      )}

      {searchParams.error === "no_valid_rows" && (
        <div className="border border-stuck bg-card p-4 text-sm text-stuck">
          No valid rows were found. Check that required columns are present and preview rows show “Ready”.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open quotes tracked" value={quoteCount ?? 0} />
        <Stat label="Unpaid invoices tracked" value={invoiceCount ?? 0} />
        <Stat label="Import limit" value="100 rows" />
        <Stat label="Auto-send" value="Off" />
      </div>

      <ImportWorkbench initialKind={kind} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-rule p-4">
      <p className="font-display text-2xl">{value}</p>
      <p className="font-mono text-[11px] uppercase tracking-wider text-faint">{label}</p>
    </div>
  );
}
