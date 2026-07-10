import Link from "next/link";

export const metadata = { title: "Terms — DueToday" };

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg tracking-tight">
            Due<span className="text-ledger">Today</span>
          </Link>
          <Link href="/privacy" className="text-sm text-faint hover:text-ink">
            Privacy
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-10 space-y-8">
        <div>
          <p className="eyebrow mb-2">Terms</p>
          <h1 className="font-display text-4xl leading-tight">Early access terms for DueToday testers</h1>
          <p className="mt-4 text-faint">
            DueToday is being tested with a small number of users before public launch. These terms set expectations for using the product during soft launch.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">Early product</h2>
          <p className="text-faint">
            DueToday is provided as an early-access testing product. It may contain rough edges, incomplete features, bugs, layout issues, or workflow gaps. The purpose of the soft launch is to find and fix these issues with real testers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">Your responsibility</h2>
          <p className="text-faint">
            You remain responsible for your business records, customer communication, quotes, invoices, collections, and follow-up decisions. DueToday helps you see and act on work due today; it does not replace your accounting, CRM, legal, or payment systems.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">No automation yet</h2>
          <p className="text-faint">
            During this phase, DueToday does not automatically message customers, chase payments, send WhatsApps, or make business decisions for you. Any follow-up remains manual unless a future version clearly says otherwise.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">Acceptable use</h2>
          <p className="text-faint">
            Do not use DueToday to spam, harass, mislead, collect unlawful debt, store sensitive personal information, or upload information you do not have the right to use. Test with normal business follow-up records only.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">Feedback</h2>
          <p className="text-faint">
            By joining early access, you agree that your product feedback can be used to improve DueToday. Feedback may be summarized internally to decide what to fix or build next.
          </p>
        </section>

        <div className="border-t border-rule pt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/privacy" className="text-ledger font-semibold hover:underline">Privacy</Link>
          <Link href="/early-access" className="text-ledger font-semibold hover:underline">Tester guide</Link>
          <Link href="/assessment" className="text-ledger font-semibold hover:underline">Start assessment</Link>
        </div>
      </article>
    </main>
  );
}
