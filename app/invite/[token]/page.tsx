import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { acceptInvitation } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accept invitation — The Admin Department" };

export default async function InvitationPage({ params }: { params: { token: string } }) {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12">
      <section className="w-full max-w-lg border border-rule bg-card p-6 shadow-card sm:p-8">
        <p className="eyebrow">Workspace invitation</p>
        <h1 className="mt-2 font-display text-4xl">Join The Admin Department workspace</h1>
        <p className="mt-3 text-faint leading-7">
          This invitation is bound to the email address selected by the workspace manager. Sign in with that same email before accepting.
        </p>
        {user ? (
          <form action={acceptInvitation} className="mt-6">
            <input type="hidden" name="token" value={params.token} />
            <p className="mb-4 text-sm text-faint">Signed in as <strong className="text-ink">{user.email}</strong></p>
            <button className="btn-primary w-full">Accept invitation</button>
          </form>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href={`/login?next=${encodeURIComponent(`/invite/${params.token}`)}`} className="btn-primary text-center">Sign in</Link>
            <Link href={`/signup?next=${encodeURIComponent(`/invite/${params.token}`)}`} className="btn-secondary text-center">Create account</Link>
          </div>
        )}
      </section>
    </main>
  );
}
