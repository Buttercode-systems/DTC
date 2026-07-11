import Link from "next/link";
import { signOut } from "@/app/signup/actions";
import { requireOperator } from "@/lib/operator";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireOperator();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-rule bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <a
              href="https://the-admin-department.vercel.app"
              className="font-display text-lg tracking-tight whitespace-nowrap"
            >
              The Admin <span className="text-ledger">Department</span>
            </a>
            <span className="hidden border-l border-rule pl-5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint sm:inline">
              Operations Console
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden max-w-[20ch] truncate text-faint md:block">{email}</span>
            <Link href="/app" className="text-ledger font-semibold hover:underline">
              DueToday
            </Link>
            <form action={signOut}>
              <button className="text-faint hover:text-ink">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
