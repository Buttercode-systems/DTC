import Link from "next/link";

export const metadata = { title: "Privacy — DueToday" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg tracking-tight">
            Due<span className="text-ledger">Today</span>
          </Link>
          <Link href="/early-access" className="text-sm text-faint hover:text-ink">
            Early access
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-10 space-y-8">
        <div>
          <p className="eyebrow mb-2">Privacy</p>
          <h1 className="font-display text-4xl leading-tight">How DueToday handles tester data</h1>
          <p className="mt-4 text-faint">
            DueToday is in early access. This page explains what data is collected during the soft launch and how testers can ask for it to be removed.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">What we collect</h2>
          <p className="text-faint">
            When you use DueToday, we may collect your assessment answers, business name, email address, leads, quotes, invoices, actions, feedback, and lightweight product usage events such as assessment completed, app opened, quote created, or action completed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">Why we collect it</h2>
          <p className="text-faint">
            We use this information to generate your report, create your Today list, help you test the product, fix bugs, understand where users get stuck, and decide what to improve before public launch.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">What not to add yet</h2>
          <p className="text-faint">
            During early access, do not use DueToday as your only business record system. Avoid adding highly sensitive information, banking details, identity numbers, medical details, passwords, or anything you cannot afford to lose.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">Data removal</h2>
          <p className="text-faint">
            Testers can ask for their test account and related data to be removed. Use the in-app feedback form or contact the DueToday owner directly with the email address used for your test account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl">Third-party services</h2>
          <p className="text-faint">
            DueToday uses Supabase for database/authentication and Vercel for hosting. Email confirmation is handled through Supabase authentication. No service-role key is used by the application runtime.
          </p>
        </section>

        <div className="border-t border-rule pt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/terms" className="text-ledger font-semibold hover:underline">Terms</Link>
          <Link href="/early-access" className="text-ledger font-semibold hover:underline">Tester guide</Link>
          <Link href="/assessment" className="text-ledger font-semibold hover:underline">Start assessment</Link>
        </div>
      </article>
    </main>
  );
}
