import Link from "next/link";
import { requireBusiness } from "@/lib/db";
import { signOut } from "@/app/signup/actions";
import { NavLinks } from "@/components/NavLinks";
import { FeedbackForm } from "@/components/FeedbackForm";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { business } = await requireBusiness();
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <header className="border-b border-rule bg-card sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-5 py-3 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/app" className="font-display text-lg tracking-tight shrink-0">
              Due<span className="text-ledger">Today</span>
            </Link>
            <div className="hidden sm:block min-w-0">
              <NavLinks />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:block text-sm text-faint truncate max-w-[16ch]">
              {business.name}
            </span>
            <form action={signOut}>
              <button className="text-sm text-faint hover:text-ink whitespace-nowrap">Sign out</button>
            </form>
          </div>
        </div>
        <div className="sm:hidden border-t border-rule px-4 py-2 overflow-x-auto [scrollbar-width:none]">
          <NavLinks />
        </div>
      </header>
      <main className="mx-auto max-w-5xl w-full px-4 sm:px-5 py-5 sm:py-8 flex-1 min-w-0">
        {children}
        <FeedbackForm businessName={business.name} />
      </main>
    </div>
  );
}
