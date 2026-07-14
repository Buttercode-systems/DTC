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
  if (error) throw new Error(`Could not load leads: ${error.message}`);

  const leadRows = leads ?? [];
  const waiting = leadRows.filter((lead) => lead.status === "new").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">First response control</p>
          <h1 className="mt-1 font-display text-3xl">Leads</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-faint">
            Capture every real enquiry. New leads remain on Today until someone records a response.
          </p>
        </div>
        <p className="font-mono text-xs text-faint">
          {waiting} waiting for a first response
        </p>
      </div>

      <section className="mt-6 bg-card p-4 shadow-card">
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Capture an enquiry</h2>
          <p className="mt-1 text-xs text-faint">Use the name and contact details the business already has. The next action appears automatically.</p>
        </div>
        <form action={createLead} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input name="customer_name" required className="field" placeholder="Who enquired?" />
          <input name="phone" className="field" placeholder="Phone / WhatsApp" />
          <input name="email" type="email" className="field" placeholder="Email" />
          <input name="source" className="field" placeholder="Source (WhatsApp, call…)" />
          <button className="btn-primary">Capture lead</button>
        </form>
      </section>

      <ul className="mt-6 bg-card shadow-card ruled">
        {leadRows.length === 0 && (
          <li className="p-6">
            <h2 className="font-display text-xl">No enquiries have been captured yet.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-faint">
              Start with the open enquiries currently sitting in WhatsApp, email, call notes or staff memory. Capturing one creates a visible first-response commitment on Today.
            </p>
          </li>
        )}
        {leadRows.map((lead) => (
          <li key={lead.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {lead.customer_name}
                {lead.source && <span className="font-normal text-faint"> · {lead.source}</span>}
              </p>
              <p className="mt-0.5 font-mono text-xs text-faint">
                arrived {agoDays(lead.received_at)}
                {lead.status === "new" ? " ago · waiting for a reply" : " ago"}
              </p>
            </div>
            {lead.phone && (
              <a
                href={whatsappLink(lead.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs font-semibold text-ledger hover:underline"
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
              <select name="status" defaultValue={lead.status} className="field !w-auto !py-1.5 text-sm">
                {Object.entries(STATUS_LABEL).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
              <button className="ml-2 inline-flex min-h-11 items-center px-2 font-mono text-xs text-faint hover:text-ink">
                Save outcome
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
