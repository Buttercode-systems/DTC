import Link from "next/link";
import { signOut } from "@/app/signup/actions";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ClaimInvitationForm } from "./ClaimInvitationForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accept Client Portal Invitation — The Admin Department" };

type Invitation = {
  business_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = String(searchParams.token ?? "").trim();
  const supabase = createSupabaseServer();
  const [{ data: auth }, invitationResult] = await Promise.all([
    supabase.auth.getUser(),
    token
      ? supabase.rpc("get_managed_client_invitation", { p_token: token })
      : Promise.resolve({ data: null, error: null }),
  ]);

  const invitation = (invitationResult.data ?? null) as Invitation | null;
  const valid = invitation && invitation.status === "pending";
  const next = `/portal/accept?token=${encodeURIComponent(token)}`;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule bg-card">
        <div className="mx-auto max-w-2xl px-5 py-4">
          <a href="https://the-admin-department.vercel.app" className="font-display text-lg tracking-tight">
            The Admin <span className="text-ledger">Department</span>
            <span className="ml-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Client Portal</span>
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-12">
        {!valid ? (
          <section className="border border-rule bg-card p-7 shadow-card sm:p-9">
            <p className="eyebrow">Invitation unavailable</p>
            <h1 className="mt-2 font-display text-4xl leading-tight">
              This Client Portal link is invalid, expired, revoked or already used.
            </h1>
            <p className="mt-4 leading-7 text-faint">
              Ask The Admin Department to create a new invitation. No workspace information has been exposed.
            </p>
            <a href="https://the-admin-department.vercel.app" className="btn-primary mt-6">
              Return to The Admin Department
            </a>
          </section>
        ) : (
          <section className="border border-rule bg-card p-7 shadow-card sm:p-9">
            <p className="eyebrow">Private managed workspace</p>
            <h1 className="mt-2 font-display text-4xl leading-tight">
              Join {invitation.business_name}
            </h1>
            <p className="mt-4 leading-7 text-faint">
              The Admin Department invited <strong className="text-ink">{invitation.email}</strong> as {invitation.role}. The invitation only works for an account using that exact email address.
            </p>
            <div className="mt-5 border border-rule bg-paper p-4 text-sm">
              <p><strong>Inside the portal:</strong> decisions, blockers, workflow progress and weekly reports.</p>
              <p className="mt-2 text-faint">TAD runs the operational workflow. Your business keeps control of approvals and service decisions.</p>
            </div>

            {auth.user ? (
              <>
                <p className="mt-5 text-sm text-faint">
                  Signed in as <strong className="text-ink">{auth.user.email}</strong>
                </p>
                <ClaimInvitationForm token={token} />
                <form action={signOut} className="mt-3 text-center">
                  <button className="text-sm font-semibold text-ledger hover:underline">Use a different account</button>
                </form>
              </>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-primary text-center">
                  Sign in
                </Link>
                <Link href={`/portal/join?token=${encodeURIComponent(token)}`} className="btn-secondary text-center">
                  Create client account
                </Link>
              </div>
            )}

            <p className="mt-5 font-mono text-[10px] uppercase tracking-wider text-faint">
              Invitation expires {formatDate(invitation.expires_at)}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-ZA", {
      timeZone: "Africa/Johannesburg",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
