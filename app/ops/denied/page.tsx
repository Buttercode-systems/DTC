import Link from "next/link";

export const metadata = { title: "Operator Access Required — TAD" };

export default function OperatorDeniedPage() {
  return (
    <main className="min-h-screen grid place-items-center px-5 py-12">
      <section className="max-w-xl border border-rule bg-card p-7 shadow-card md:p-9">
        <p className="eyebrow">Access restricted</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">
          This account is not a TAD operator.
        </h1>
        <p className="mt-4 leading-7 text-faint">
          An existing administrator must grant operator access before this account
          can see managed client workspaces, approvals or reports.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/app" className="btn-secondary">Return to DueToday</Link>
          <a href="https://the-admin-department.vercel.app" className="btn-primary">
            TAD website
          </a>
        </div>
      </section>
    </main>
  );
}
