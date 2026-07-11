import Link from "next/link";

export const metadata = { title: "TAD Operator — DueToday" };

export default function OperatorHandoffPage() {
  return (
    <main className="min-h-screen grid place-items-center px-5 py-12">
      <section className="max-w-xl bg-card shadow-card p-7 md:p-9">
        <p className="eyebrow">The Admin Department</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">
          Create or choose a managed client workspace.
        </h1>
        <p className="mt-4 text-faint leading-7">
          Your account has operator access but no client workspace is selected yet.
          Use the TAD Operations Console to onboard a business, assign its first
          department and create the initial service setup action.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            className="btn-primary"
            href="https://the-admin-department.vercel.app/ops/"
          >
            Open TAD Operations Console
          </a>
          <Link href="/" className="btn-secondary">
            DueToday home
          </Link>
        </div>
      </section>
    </main>
  );
}
