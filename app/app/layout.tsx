import Link from "next/link";
import { requireBusiness } from "@/lib/db";
import { signOut } from "@/app/signup/actions";
import { NavLinks } from "@/components/NavLinks";
import { FeedbackForm } from "@/components/FeedbackForm";
import { BusinessSwitcher } from "@/components/BusinessSwitcher";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { business, businesses } = await requireBusiness();
  const managed = business.managed_by_tad;

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <header className="border-b border-rule bg-card sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-5 py-3 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-6 min-w-0">
            <Link href={managed ? "/app/service" : "/app"} className="font-display text-lg tracking-tight shrink-0">
              {managed ? (
                <span className="inline-flex items-baseline gap-2">
                  <span>The Admin <span className="text-ledger">Department</span></span>
                  <span className="hidden lg:inline font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Client Portal</span>
                </span>
              ) : (
                <>Due<span className="text-ledger">Today</span></>
              )}
            </Link>
            <div className="hidden sm:block min-w-0"><NavLinks managedByTad={managed} /></div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <BusinessSwitcher businesses={businesses} activeBusinessId={business.id} />
            <form action={signOut}><button className="text-sm text-faint hover:text-ink whitespace-nowrap">Sign out</button></form>
          </div>
        </div>
        <div className="sm:hidden border-t border-rule px-4 py-2 overflow-x-auto [scrollbar-width:none]">
          <NavLinks managedByTad={managed} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl w-full px-4 sm:px-5 py-5 sm:py-8 flex-1 min-w-0">
        {managed && (
          <div className="mb-6 flex flex-col gap-2 border border-ledger/30 bg-ledger/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div><strong>{business.name}</strong><span className="text-faint"> · Managed by The Admin Department</span></div>
            <a href="https://the-admin-department.vercel.app" className="font-semibold text-ledger hover:underline">Public service site</a>
          </div>
        )}
        {children}
        {!managed && <FeedbackForm businessName={business.name} />}
      </main>
    </div>
  );
}
