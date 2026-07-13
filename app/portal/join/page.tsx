import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { JoinManagedClientForm } from "./JoinManagedClientForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create Client Portal Account — The Admin Department" };

type Invitation = {
  business_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

export default async function JoinManagedClientPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = String(searchParams.token ?? "").trim();
  const supabase = createSupabaseServer();
  const { data } = token
    ? await supabase.rpc("get_managed_client_invitation", { p_token: token })
    : { data: null };
  const invitation = (data ?? null) as Invitation | null;
  const valid = invitation && invitation.status === "pending";
  const next = `/portal/accept?token=${encodeURIComponent(token)}`;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule bg-card">
        <div className="mx-auto max-w-md px-5 py-4">
          <a href="https://the-admin-department.vercel.app" className="font-display text-lg tracking-tight">
            The Admin <span className="text-ledger">Department</span>
            <span className="ml-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Client Portal</span>
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-12">
        {!valid ? (
          <section className="border border-rule bg-card p-7 shadow-card">
            <p className="eyebrow">Invitation unavailable</p>
            <h1 className="mt-2 font-display text-3xl">Ask TAD for a new invitation.</h1>
            <p className="mt-3 leading-7 text-faint">This link is invalid, expired, revoked or already used.</p>
          </section>
        ) : (
          <section className="border border-rule bg-card p-7 shadow-card">
            <p className="eyebrow">{invitation.business_name}</p>
            <h1 className="mt-2 font-display text-3xl leading-tight">Create your Client Portal account</h1>
            <p className="mt-3 leading-7 text-faint">
              This account will only receive the managed {invitation.role} access attached to <strong className="text-ink">{invitation.email}</strong>. It will not create a separate DueToday business.
            </p>
            <JoinManagedClientForm token={token} email={invitation.email} />
            <p className="mt-5 text-center text-sm text-faint">
              Already have an account?{" "}
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-ledger hover:underline">
                Sign in
              </Link>
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
