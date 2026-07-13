import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { claimClientInvitation } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Client Portal Invitation — The Admin Department" };

type Invitation = {
  id: string;
  business_id: string;
  business_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

export default async function InvitationPage({ params }: { params: { token: string } }) {
  const supabase = createSupabaseServer();
  const [{ data: invitationData, error }, { data: { user } }] = await Promise.all([
    supabase.rpc("get_managed_client_invitation", { p_token: params.token }),
    supabase.auth.getUser(),
  ]);
  if (error) throw new Error(`Could not load invitation: ${error.message}`);
  const invitation = invitationData as Invitation | null;

  if (!invitation) {
    return <State title="Invitation not found" detail="This link is invalid or no longer exists." />;
  }
  if (invitation.status !== "pending") {
    return <State title={`Invitation ${invitation.status}`} detail="Ask The Admin Department for a new invitation if access is still required." />;
  }

  const emailMatches = user?.email?.toLowerCase() === invitation.email.toLowerCase();

  return (
    <main className="min-h-screen grid place-items-center px-5 py-12">
      <section className="w-full max-w-xl border border-rule bg-card p-7 shadow-card md:p-9">
        <p className="eyebrow">The Admin Department Client Portal</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">Join {invitation.business_name}</h1>
        <p className="mt-4 leading-7 text-faint">
          You were invited as <strong>{invitation.role}</strong>. Access is restricted to <strong>{invitation.email}</strong> and expires {formatDate(invitation.expires_at)}.
        </p>

        {!user ? (
          <div className="mt-6 space-y-3">
            <Link href={`/login?next=/invite/${encodeURIComponent(params.token)}`} className="btn-primary block w-full text-center">
              Sign in with {invitation.email}
            </Link>
            <Link href="/signup" className="btn-secondary block w-full text-center">
              Create an account with this email
            </Link>
            <p className="text-xs leading-5 text-faint">After creating and confirming the account, reopen this invitation link.</p>
          </div>
        ) : !emailMatches ? (
          <div className="mt-6 border border-stuck/40 bg-stuck/5 p-4">
            <p className="font-semibold">Signed in as {user.email}</p>
            <p className="mt-1 text-sm text-faint">This invitation belongs to {invitation.email}. Sign out and use the invited account.</p>
          </div>
        ) : (
          <form action={claimClientInvitation} className="mt-6">
            <input type="hidden" name="token" value={params.token} />
            <button className="btn-primary w-full">Accept and open Client Portal</button>
          </form>
        )}
      </section>
    </main>
  );
}

function State({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="min-h-screen grid place-items-center px-5 py-12">
      <section className="max-w-xl border border-rule bg-card p-7 shadow-card md:p-9">
        <p className="eyebrow">Client Portal invitation</p>
        <h1 className="mt-2 font-display text-4xl">{title}</h1>
        <p className="mt-4 leading-7 text-faint">{detail}</p>
        <a href="https://the-admin-department.vercel.app" className="btn-secondary mt-6">TAD website</a>
      </section>
    </main>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
