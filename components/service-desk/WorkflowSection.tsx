import { EmptyState, Metric, Status } from "@/components/service-desk/Shared";
import type { ServiceDesk } from "@/components/service-desk/types";

export function WorkflowSection({ workflow }: { workflow: ServiceDesk["workflow"] }) {
  return (
    <section className="space-y-5 border-t border-rule pt-8">
      <div>
        <p className="eyebrow">Workflow visibility</p>
        <h2 className="mt-1 font-display text-3xl">What is moving and what needs attention</h2>
      </div>

      {!workflow ? (
        <EmptyState
          title="The managed workflow is being configured."
          detail="TAD will publish the workflow map after the department setup is installed."
        />
      ) : (
        <>
          {workflow.data_warning && (
            <div className="border border-slowing/40 bg-slowing/10 px-4 py-3 text-sm">
              <strong>Protected workflow.</strong> {workflow.data_warning}
            </div>
          )}

          <div className="flex gap-px overflow-x-auto border border-rule bg-rule [scrollbar-width:none]">
            {workflow.statuses.map((status) => (
              <div key={status} className="min-w-36 flex-1 bg-card p-4">
                <p className="text-xs font-semibold leading-5">{status}</p>
                <p className="mt-2 font-display text-3xl">{workflow.status_counts[status] ?? 0}</p>
              </div>
            ))}
          </div>

          {workflow.attention_items.length === 0 ? (
            <EmptyState
              title="No workflow record needs your attention."
              detail="The operator can continue running the queue without a client decision."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {workflow.attention_items.map((item) => (
                <article
                  key={item.id}
                  className={`border bg-card p-5 ${item.blocked_reason ? "border-stuck/50" : "border-rule"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="eyebrow">{item.reference} · P{item.priority}</p>
                      <h3 className="mt-1 font-display text-xl">{item.title}</h3>
                    </div>
                    <Status value={item.status} />
                  </div>

                  {item.blocked_reason && (
                    <p className="mt-4 border-l-2 border-stuck pl-3 text-sm">
                      <strong>Blocked:</strong> {item.blocked_reason}
                    </p>
                  )}

                  <dl className="mt-4 grid gap-3 border-t border-rule pt-4 text-sm sm:grid-cols-2">
                    <Metric label="Owner" value={item.assigned_name || "Not assigned"} />
                    <Metric label="Due" value={item.due_date || "No date"} />
                    <Metric label="Next action" value={item.next_action || "Not recorded"} />
                    <Metric label="Latest outcome" value={item.last_outcome_code || "None"} />
                  </dl>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
