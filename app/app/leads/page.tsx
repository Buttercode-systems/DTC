import { requireBusiness } from "@/lib/db";
import { createLead, setLeadStatus } from "@/app/app/actions";
import { agoDays, whatsappLink } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads — DueToday" };

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  responded: "Responded",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

export default async function LeadsPage() {
  const { supabase, business } = await requireBusiness();
  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .eq("business_id", business.id)
    .order("received_at", { ascending: false })
    .limit(200);
  // A failed query must not render as "No leads yet."
  if (error) throw new Error(`Could not load leads: ${error.message}`);

  return (
    <div>
      <h1 className="font-display text-2xl">Leads</h1>
      <p className="mt-1 text-faint text-sm">
        Every enquiry lands here the moment it arrives. New leads surface on
        Today until someone replies.
      </p>

      <form action={createLead} className="mt-6 bg-card shadow-card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input name="customer_name" required className="field" placeholder="Who enquired?" />
        <input name="phone" className="field" placeholder="Phone / WhatsApp" />
        <input name="email" type="email" className="field" placeholder="Email" />
        <input name="source" className="field" placeholder="Source (WhatsApp, call…)" />
        <button className="btn-primary">Capture lead</button>
      </form>

      <ul className="mt-6 bg-card shadow-card ruled">
        {(leads ?? []).length === 0 && (
          <li className="p-6 text-sm text-faint">
            No leads yet. Capture every open enquiry from your phone, inbox and
            WhatsApp — even the ones you think are dead.
          </li>
        )}
        {(leads ?? []).map((lead) => (
          <li key={lead.id} className="p-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">
                {lead.customer_name}
                {lead.source && (
                  <span className="text-faint font-normal"> · {lead.source}</span>
                )}
              </p>
              <p className="font-mono text-xs text-faint mt-0.5">
                arrived {agoDays(lead.received_at)}
                {lead.status === "new" ? " ago · waiting for a reply" : " ago"}
              </p>
            </div>
            {lead.phone && (
              <a
                href={whatsappLink(lead.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-ledger font-semibold hover:underline"
              >
                WhatsApp →
              </a>
            )}
            <form
              action={async (formData: FormData) => {
                "use server";
                await setLeadStatus(lead.id, String(formData.get("status")));
              }}
            >
              <select
                name="status"
                defaultValue={lead.status}
                className="field !w-auto !py-1.5 text-sm"
              >
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button className="inline-flex items-center min-h-11 ml-2 px-2 text-xs font-mono text-faint hover:text-ink">
                Update
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
