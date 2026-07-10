import Link from "next/link";
import { JOBS } from "@/lib/framework";
import { longDate } from "@/lib/format";

const DEMO_LIST = [
  { text: "Reply to new enquiry — Nomsa", job: "Acquire", done: true },
  { text: "Follow up Quote #215 — Themba", job: "Convert", done: true },
  { text: "Confirm delivery blocker — Riverside job", job: "Deliver", done: false },
  { text: "Chase overdue Invoice #390 — R6 200", job: "Collect", done: false },
  { text: "Approve supplier invoice — BuildIt", job: "Control", done: false },
  { text: "Review why three quotes went quiet", job: "Improve", done: false },
];

export default function LandingPage() {
  return (
    <main>
      <header className="border-b border-rule">
        <div className="mx-auto max-w-6xl px-5 py-3.5 flex items-center justify-between gap-4">
          <span className="font-display text-lg tracking-tight shrink-0">
            Due<span className="text-ledger">Today</span>
          </span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/early-access" className="hidden sm:inline text-faint hover:text-ink">
              Early access
            </Link>
            <Link href="/login" className="text-faint hover:text-ink">
              Sign in
            </Link>
            <Link href="/assessment" className="btn-primary !py-2 !px-4 text-sm">
              Free assessment
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-12 md:py-18 grid gap-10 md:grid-cols-[1.02fr_0.98fr] md:items-center">
        <div>
          <p className="eyebrow mb-4">Business Execution OS</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-2xl">
            Find what&apos;s stuck. Know what to do next. Keep your business moving.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-faint">
            DueToday diagnoses how work moves through your business, shows where it slows down, and turns the biggest leaks into one clear Today list.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-faint">
            Money actions are the visible signal. The system still looks across leads, quotes, delivery, collection, admin, improvement and leadership.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/assessment" className="btn-primary">
              Start the free assessment
            </Link>
            <a href="#how" className="btn-secondary">
              How it works
            </a>
          </div>
          <p className="mt-4 font-mono text-[11px] text-faint">
            Early access · 35 questions · Momentum Report · Today actions
          </p>
        </div>

        <div className="bg-card shadow-card p-5 md:p-6">
          <div className="flex items-end justify-between gap-4 mb-4">
            <span className="stamp text-lg">Today</span>
            <span className="font-mono text-[11px] text-faint text-right">{longDate()}</span>
          </div>
          <ul className="ruled">
            {DEMO_LIST.map((item) => (
              <li key={item.text} className="flex items-start gap-3 py-2.5">
                <span
                  aria-hidden
                  className={`mt-0.5 h-4 w-4 shrink-0 border-2 border-ink ${
                    item.done ? "bg-ledger border-ledger" : "bg-transparent"
                  }`}
                />
                <span className={`min-w-0 flex-1 text-sm leading-5 ${item.done ? "line-through text-faint" : ""}`}>
                  {item.text}
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-faint">
                  {item.job}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[11px] text-faint text-right">
            Clear today&apos;s work. Keep moving.
          </p>
        </div>
      </section>

      <section id="how" className="border-t border-rule bg-card">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <p className="eyebrow mb-3">What the assessment measures</p>
          <h2 className="font-display text-2xl md:text-3xl max-w-2xl leading-tight">
            Every business does seven jobs. DueToday finds which ones are moving, slowing, or stuck.
          </h2>
          <div className="mt-8 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-4 border border-rule">
            {JOBS.map((job) => (
              <div key={job.key} className="bg-paper p-4 md:p-5">
                <p className="font-display text-ledger leading-none">{job.verb}</p>
                <p className="mt-2 text-sm font-semibold">{job.label}</p>
                <p className="mt-2 text-sm leading-6 text-faint">{job.question}</p>
              </div>
            ))}
            <div className="bg-ink text-paper p-4 md:p-5 flex flex-col justify-between">
              <p className="text-sm leading-6 text-paper/85">
                Each job is measured on five dimensions: process, documentation, accountability, measurement and review.
              </p>
              <p className="mt-4 font-mono text-[11px] text-paper/60">
                7 jobs × 5 dimensions = your Momentum Map
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <p className="eyebrow mb-3">How it works</p>
        <div className="grid gap-px bg-rule border border-rule md:grid-cols-3">
          <Step number="01" title="Diagnose">
            Answer 35 concrete questions about how work actually moves across Acquire, Convert, Deliver, Collect, Control, Improve and Lead.
          </Step>
          <Step number="02" title="Map the stuck work">
            Your Momentum Report shows what is moving, slowing, or stuck, then recommends the capability to fix first.
          </Step>
          <Step number="03" title="Act today">
            The report becomes your first Today list. Records, imports and modules exist to feed that daily action queue.
          </Step>
        </div>
        <div className="mt-10 border-t border-rule pt-8 text-center">
          <p className="font-display text-2xl max-w-2xl mx-auto leading-tight">
            Diagnose before prescribing. Actions before records. Today before dashboards.
          </p>
          <Link href="/assessment" className="btn-primary mt-6">
            Start the free assessment
          </Link>
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto max-w-6xl px-5 py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-faint">
          <span className="font-display text-ink">
            Due<span className="text-ledger">Today</span>
          </span>
          <div className="flex flex-wrap gap-4 font-mono text-xs">
            <Link href="/early-access" className="hover:text-ink">Early access</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card p-5">
      <p className="font-mono text-[11px] text-ledger font-semibold">{number}</p>
      <p className="mt-2 font-display text-xl">{title}</p>
      <p className="mt-2 text-sm leading-6 text-faint">{children}</p>
    </div>
  );
}
