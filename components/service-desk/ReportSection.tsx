import { respondToServiceReport } from "@/app/app/service/actions";
import { money } from "@/lib/format";
import { EmptyState, Status } from "@/components/service-desk/Shared";
import type { ServiceReport } from "@/components/service-desk/types";

export function ReportSection({ reports, canManage }: { reports: ServiceReport[]; canManage: boolean }) {
  return (
    <section className="space-y-5 border-t border-rule pt-8">
      <div>
        <p className="eyebrow">Weekly proof</p>
        <h2 className="mt-1 font-display text-3xl">Service reports</h2>
        <p className="mt-2 max-w-3xl text-faint">
          Each report shows what was completed, what remains due and whether the workflow should continue, change or stop.
        </p>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          title="No weekly report is ready yet."
          detail="The first report appears after TAD runs the workflow and closes the review period."
        />
      ) : (
        <div className="space-y-5">
          {reports.map((report, index) => (
            <article key={report.id} className="border border-rule bg-card p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{index === 0 ? "Latest report" : "Service report"}</p>
                  <h3 className="mt-1 font-display text-2xl">
                    {report.period_start} to {report.period_end}
                  </h3>
                  {report.summary && (
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-faint">{report.summary}</p>
                  )}
                </div>
                <Status value={report.client_response ? `client: ${report.client_response}` : report.status} />
              </div>

              <div className="mt-5 grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(report.metrics).map(([key, value]) => (
                  <div key={key} className="bg-paper p-4">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                      {key.replaceAll("_", " ")}
                    </p>
                    <p className="mt-2 font-display text-2xl">
                      {key.includes("value") ? money(value) : String(value)}
                    </p>
                  </div>
                ))}
              </div>

              {report.client_response ? (
                <div className="mt-5 border-l-2 border-ledger pl-4 text-sm">
                  <p><strong>Your decision:</strong> {report.client_response}</p>
                  {report.client_response_note && (
                    <p className="mt-1 text-faint">{report.client_response_note}</p>
                  )}
                </div>
              ) : canManage ? (
                <form action={respondToServiceReport} className="mt-5 grid gap-3 border border-rule bg-paper p-4">
                  <input type="hidden" name="report_id" value={report.id} />
                  <label className="text-sm font-semibold">
                    What should happen next?
                    <textarea
                      name="response_note"
                      rows={2}
                      className="field mt-1 resize-y"
                      placeholder="Optional changes, concerns or conditions"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button name="response" value="continue" className="btn-primary !px-3 !py-2 text-sm">
                      Continue
                    </button>
                    <button name="response" value="change" className="btn-secondary !px-3 !py-2 text-sm">
                      Change the workflow
                    </button>
                    <button name="response" value="stop" className="btn-secondary !px-3 !py-2 text-sm">
                      Stop
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-5 border border-rule bg-paper p-4 text-sm text-faint">
                  An owner or manager must submit the continue, change or stop decision.
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
