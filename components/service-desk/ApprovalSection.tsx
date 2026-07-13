import { decideClientApproval } from "@/app/app/service/actions";
import { money } from "@/lib/format";
import { EmptyState } from "@/components/service-desk/Shared";
import type { Approval } from "@/components/service-desk/types";

export function ApprovalSection({ approvals, canManage }: { approvals: Approval[]; canManage: boolean }) {
  const pending = approvals.filter((approval) => approval.status === "pending");

  return (
    <section id="decisions" className="scroll-mt-28 space-y-5">
      <div>
        <p className="eyebrow">Your decisions</p>
        <h2 className="mt-1 font-display text-3xl">Approvals waiting</h2>
        <p className="mt-2 max-w-3xl text-faint">
          TAD prepares the work and supporting context. Important financial, customer and supplier decisions remain human-approved.
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState title="No decisions are waiting." detail="TAD will place approvals here when your input is required." />
      ) : (
        <div className="space-y-4">
          {pending.map((approval) => (
            <article id={`approval-${approval.id}`} key={approval.id} className="scroll-mt-24 border border-rule bg-card p-5 shadow-card">
              <div className="grid gap-5 lg:grid-cols-[1fr_24rem] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="eyebrow">Decision required</p>
                      <h3 className="mt-1 font-display text-2xl">{approval.title}</h3>
                    </div>
                    {approval.amount !== null && <span className="stamp text-base">{money(approval.amount)}</span>}
                  </div>
                  {approval.detail && <p className="mt-3 text-sm leading-6 text-faint">{approval.detail}</p>}
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-faint">
                    {approval.due_date ? `Decision due ${approval.due_date}` : "No decision date set"}
                  </p>
                </div>

                {canManage ? (
                  <form action={decideClientApproval} className="grid gap-3 border border-rule bg-paper p-4">
                    <input type="hidden" name="approval_id" value={approval.id} />
                    <label className="text-sm font-semibold">
                      Decision note
                      <textarea name="decision_note" rows={3} className="field mt-1 resize-y" placeholder="Optional reason, limit or instruction" />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button name="decision" value="approved" className="btn-primary !px-3 !py-2 text-sm">Approve</button>
                      <button name="decision" value="rejected" className="btn-secondary !px-3 !py-2 text-sm">Reject</button>
                    </div>
                  </form>
                ) : (
                  <div className="border border-rule bg-paper p-4 text-sm">
                    <p className="font-semibold">Owner or manager decision required</p>
                    <p className="mt-2 text-faint">You can review the context, but your current workspace role cannot approve or reject this request.</p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
