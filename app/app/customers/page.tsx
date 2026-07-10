import { requireBusiness } from "@/lib/db";
import { createCustomer } from "@/app/app/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers — DueToday" };

export default async function CustomersPage() {
  const { supabase, business } = await requireBusiness();
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, phone, email")
    .eq("business_id", business.id)
    .order("name")
    .limit(500);
  // A failed query must not render as "No customers yet."
  if (error) throw new Error(`Could not load customers: ${error.message}`);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="font-display text-2xl">Customers</h1>
        <p className="text-sm text-faint mt-1">
          Quotes and invoices attach to customers so follow-ups carry the right
          name and number.
        </p>
        <ul className="mt-5 bg-card shadow-card ruled">
          {(customers ?? []).length === 0 && (
            <li className="p-6 text-sm text-faint">No customers yet.</li>
          )}
          {(customers ?? []).map((c) => (
            <li key={c.id} className="p-4 flex flex-wrap justify-between gap-2">
              <p className="font-semibold text-sm">{c.name}</p>
              <p className="font-mono text-xs text-faint">
                {c.phone ?? "—"} · {c.email ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <aside>
        <div className="bg-card shadow-card p-4 lg:sticky lg:top-28">
          <h2 className="font-semibold text-sm">New customer</h2>
          <form action={createCustomer} className="mt-3 space-y-2">
            <input name="name" required className="field" placeholder="Name" />
            <input name="phone" className="field" placeholder="Phone" />
            <input name="email" className="field" placeholder="Email" />
            <button className="btn-primary w-full !py-2 text-sm">Add customer</button>
          </form>
        </div>
      </aside>
    </div>
  );
}
