import { requireBusiness } from "@/lib/db";
import { updateSettings } from "@/app/app/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — DueToday" };

export default async function SettingsPage() {
  const { business } = await requireBusiness();
  const s = business.settings;

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl">Settings</h1>
      <p className="text-sm text-faint mt-1">
        These numbers drive the engine — how fast leads must be answered, how
        often quotes get chased, when invoices escalate.
      </p>
      <form action={updateSettings} className="mt-6 bg-card shadow-card p-5 space-y-4">
        <label className="block text-sm">
          <span className="font-semibold">Lead response window (hours)</span>
          <span className="block text-xs text-faint">
            A new lead becomes urgent on Today after this long without a reply.
          </span>
          <input
            name="lead_response_hours"
            type="number"
            min={1}
            max={72}
            defaultValue={s.lead_response_hours}
            className="field mt-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Quote follow-up cadence (days)</span>
          <span className="block text-xs text-faint">
            Open quotes come back onto Today every this-many days until decided.
          </span>
          <input
            name="quote_followup_days"
            type="number"
            min={1}
            max={30}
            defaultValue={s.quote_followup_days}
            className="field mt-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Quote validity (days)</span>
          <span className="block text-xs text-faint">
            After this, quotes are marked expired and you&apos;re prompted to
            re-quote or close.
          </span>
          <input
            name="quote_expiry_days"
            type="number"
            min={7}
            max={365}
            defaultValue={s.quote_expiry_days}
            className="field mt-2"
          />
        </label>
        <div className="pt-2 border-t border-rule">
          <p className="text-sm font-semibold">Invoice chase schedule</p>
          <p className="text-xs text-faint mt-1">
            Fixed at {s.invoice_chase_days.join(", ")} days after due date, then
            daily. Overdue invoices never fall off the list.
          </p>
        </div>
        <button className="btn-primary w-full">Save settings</button>
      </form>
    </div>
  );
}
