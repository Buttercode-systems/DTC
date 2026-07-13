import Link from "next/link";
import { requireBusiness } from "@/lib/db";
import { importDepartmentCsv } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Imports — The Admin Department" };

const DEPARTMENTS = [
  ["invoice", "Invoice Admin"],
  ["sales", "Sales Admin"],
  ["client", "Client Admin"],
  ["property", "Property Admin"],
  ["practice", "Practice / Booking Admin"],
  ["member", "Member Admin"],
] as const;

export default async function ImportPage({
  searchParams,
}: {
  searchParams: { department?: string; imported?: string; skipped?: string; batch?: string };
}) {
  const { supabase, business } = await requireBusiness();
  const [{ data: engagements }, { data: batches, error: batchError }] = await Promise.all([
    supabase
      .from("service_engagements")
      .select("department,enabled,delivery_mode")
      .eq("business_id", business.id)
      .in("department", DEPARTMENTS.map(([key]) => key)),
    supabase
      .from("department_import_batches")
      .select("id,department,filename,row_count,imported_count,skipped_count,status,created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (batchError) throw new Error(`Could not load import history: ${batchError.message}`);

  const active = new Set((engagements ?? []).filter((item) => item.enabled).map((item) => item.department));
  const imported = Number(searchParams.imported ?? "");
  const skipped = Number(searchParams.skipped ?? "");

  return (
    <div className="space-y-8">
      <section className="border-b border-rule pb-7">
        <p className="eyebrow">All-department data onboarding</p>
        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">Imports</h1>
            <p className="mt-3 max-w-3xl text-faint leading-7">
              Load records into any active TAD department using one controlled CSV format. Each import validates statuses, dates, priorities and duplicate references before records enter the workspace.
            </p>
          </div>
          <Link href="/app/departments" className="btn-secondary">Manage departments</Link>
        </div>
      </section>

      {searchParams.batch && Number.isFinite(imported) && (
        <section className="border border-ledger/30 bg-ledger-tint p-5">
          <h2 className="font-display text-2xl">Import completed</h2>
          <p className="mt-2 text-sm text-faint">Imported {imported} row{imported === 1 ? "" : "s"}; skipped {Number.isFinite(skipped) ? skipped : 0} invalid or duplicate row{skipped === 1 ? "" : "s"}.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/app" className="btn-primary">Open unified Today</Link>
            {searchParams.department && <Link href={`/app/departments/${searchParams.department}`} className="btn-secondary">Open department</Link>}
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <article className="border border-rule bg-card p-5 sm:p-6">
          <h2 className="font-display text-2xl">Import CSV</h2>
          <p className="mt-2 text-sm leading-6 text-faint">
            Required column: <code>title</code>. Recommended columns: <code>reference</code>, <code>status</code>, <code>assigned_name</code>, <code>priority</code>, <code>next_action</code>, <code>due_date</code>, <code>blocked_reason</code>. Department fields use <code>data.field_key</code>.
          </p>
          <form action={importDepartmentCsv} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">
              Department
              <select name="department" required className="field mt-1" defaultValue={searchParams.department ?? "sales"}>
                {DEPARTMENTS.map(([key, label]) => (
                  <option key={key} value={key} disabled={!active.has(key)}>
                    {label}{active.has(key) ? "" : " — activate first"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              CSV file
              <input name="file" type="file" accept=".csv,text/csv" required className="field mt-1" />
            </label>
            <div className="border border-rule bg-paper p-4 text-xs leading-6 text-faint">
              Maximum 1,000 rows and 2 MB per import. Dates must use YYYY-MM-DD. Duplicate department references are skipped and recorded in the batch result.
            </div>
            <button className="btn-primary w-full">Validate and import</button>
          </form>
        </article>

        <aside className="border border-rule bg-card p-5">
          <h2 className="font-display text-2xl">Starter CSV</h2>
          <pre className="mt-4 overflow-x-auto border border-rule bg-paper p-3 text-[10px] leading-5">{`reference,title,status,assigned_name,priority,next_action,due_date,blocked_reason
SALE-001,Follow up accepted quote,Quote accepted,Thato,80,Confirm installation date,2026-07-15,
SALE-002,Recover stalled quote,Follow-up due,Lebo,70,Call decision maker,2026-07-14,Waiting for revised scope`}</pre>
          <p className="mt-3 text-xs leading-5 text-faint">Use the exact status labels shown inside the selected department. Leave reference blank to generate one automatically.</p>
        </aside>
      </section>

      <section>
        <p className="eyebrow">Recent imports</p>
        <h2 className="mt-1 font-display text-3xl">Import history</h2>
        {(batches ?? []).length === 0 ? (
          <div className="mt-4 border border-dashed border-rule bg-card p-6 text-sm text-faint">No department imports yet.</div>
        ) : (
          <div className="mt-4 overflow-x-auto border border-rule bg-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-rule bg-paper text-left text-xs uppercase tracking-wider text-faint">
                <tr><th className="p-3">Department</th><th className="p-3">File</th><th className="p-3">Rows</th><th className="p-3">Imported</th><th className="p-3">Skipped</th><th className="p-3">Status</th><th className="p-3">Date</th></tr>
              </thead>
              <tbody>
                {(batches ?? []).map((batch) => (
                  <tr key={batch.id} className="border-b border-rule last:border-0">
                    <td className="p-3 capitalize">{batch.department}</td>
                    <td className="p-3">{batch.filename || "import.csv"}</td>
                    <td className="p-3">{batch.row_count}</td>
                    <td className="p-3">{batch.imported_count}</td>
                    <td className="p-3">{batch.skipped_count}</td>
                    <td className="p-3 capitalize">{batch.status}</td>
                    <td className="p-3">{new Date(batch.created_at).toLocaleString("en-ZA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
