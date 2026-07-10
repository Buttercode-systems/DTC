import Link from "next/link";

export const metadata = { title: "Early Access — DueToday" };

const STEPS = [
  "Take the Business Execution Assessment.",
  "Read your report and note the top stuck area.",
  "Create your DueToday account and confirm your email.",
  "Open Today and add one real lead, one old quote, or one overdue invoice.",
  "Refresh Today, clear the action, and check whether the flow makes sense.",
  "Use the in-app feedback form to say what confused you, what broke, and whether you would pay for this.",
];

export default function EarlyAccessPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg tracking-tight">
            Due<span className="text-ledger">Today</span>
          </Link>
          <Link href="/assessment" className="btn-primary !py-2 !px-4 text-sm">
            Start test
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-10 space-y-10">
        <section className="bg-card shadow-card p-6 md:p-8">
          <p className="eyebrow mb-2">Early access tester guide</p>
          <h1 className="font-display text-4xl md:text-5xl leading-tight">
            Test DueToday in 10 minutes.
          </h1>
          <p className="mt-4 text-lg text-faint max-w-2xl">
            DueToday is ready for controlled soft-launch testing. The goal is not perfection yet — the goal is to find whether real business owners understand the daily money-action workflow.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/assessment" className="btn-primary">Start the assessment</Link>
            <Link href="/privacy" className="btn-secondary">Read privacy note</Link>
          </div>
        </section>

        <section>
          <p className="eyebrow mb-3">How to test</p>
          <ol className="bg-card shadow-card ruled">
            {STEPS.map((step, index) => (
              <li key={step} className="p-4 flex gap-4">
                <span className="font-mono text-ledger font-semibold">{String(index + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="border border-rule bg-card p-5">
            <h2 className="font-display text-xl">Good feedback</h2>
            <p className="mt-2 text-sm text-faint">
              “I expected the quote to appear immediately on Today, but I had to refresh.”
            </p>
          </div>
          <div className="border border-rule bg-card p-5">
            <h2 className="font-display text-xl">Weak feedback</h2>
            <p className="mt-2 text-sm text-faint">
              “Looks nice.” Useful, but not enough to decide what to fix.
            </p>
          </div>
          <div className="border border-rule bg-card p-5">
            <h2 className="font-display text-xl">Best test data</h2>
            <p className="mt-2 text-sm text-faint">
              One real unpaid invoice, one old quote, or one waiting WhatsApp lead.
            </p>
          </div>
        </section>

        <section className="bg-ink text-paper p-6 md:p-8">
          <h2 className="font-display text-3xl">Important</h2>
          <p className="mt-3 text-paper/80">
            Do not use DueToday as your only business record system yet. Keep your normal records. This is a soft-launch test to prove the daily workflow and find rough edges before broader release.
          </p>
        </section>
      </div>
    </main>
  );
}
