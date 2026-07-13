import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/signup/actions";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/hq");

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-rule bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <a href="https://the-admin-department.vercel.app" className="font-display text-lg tracking-tight whitespace-nowrap">
              The Admin <span className="text-ledger">Department</span>
              <span className="ml-2 hidden font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-faint lg:inline">Admin HQ</span>
            </a>
            <nav className="hidden items-center gap-4 border-l border-rule pl-5 text-sm sm:flex">
              <Link href="/ops" className="font-semibold text-ink hover:text-ledger">Control room</Link>
              <Link href="/ops/applications" className="font-semibold text-ink hover:text-ledger">Applications</Link>
              <Link href="/ops/workflows" className="font-semibold text-ink hover:text-ledger">Workflows</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden max-w-[20ch] truncate text-faint md:block">{user.email}</span>
            <a href="https://the-admin-department.vercel.app" className="text-ledger font-semibold hover:underline">Public site</a>
            <form action={signOut}><button className="text-faint hover:text-ink">Sign out</button></form>
          </div>
        </div>
        <nav className="flex gap-4 overflow-x-auto border-t border-rule px-4 py-2 text-sm sm:hidden">
          <Link href="/ops" className="font-semibold">Control room</Link>
          <Link href="/ops/applications" className="font-semibold">Applications</Link>
          <Link href="/ops/workflows" className="font-semibold">Workflows</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
