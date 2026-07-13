import Link from "next/link";
import { SignUpForm } from "./SignUpForm";

export function generateMetadata({ searchParams }: { searchParams: { next?: string } }) {
  const tadMode = (searchParams.next ?? "").startsWith("/portal");
  return { title: tadMode ? "Activate Client Portal — The Admin Department" : "Install DueToday" };
}

export default function SignUpPage({
  searchParams,
}: {
  searchParams: { assessment?: string; next?: string; email?: string; business?: string };
}) {
  const next = searchParams.next ?? "/app";
  const tadMode = next.startsWith("/portal");

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-md w-full px-5 py-4">
          {tadMode ? (
            <a href="https://the-admin-department.vercel.app" className="font-display text-lg tracking-tight">
              The Admin <span className="text-ledger">Department</span>
              <span className="ml-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Client Portal</span>
            </a>
          ) : (
            <Link href="/" className="font-display text-lg tracking-tight">
              Due<span className="text-ledger">Today</span>
            </Link>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-md w-full px-5 py-12 flex-1">
        <h1 className="font-display text-2xl">
          {tadMode ? "Activate your Client Portal" : "Install your action system"}
        </h1>
        <p className="mt-2 text-faint text-sm">
          {tadMode
            ? "Use the same email address supplied to The Admin Department. Access is granted only when it matches the verified primary contact on your managed workspace."
            : searchParams.assessment
              ? "Your assessment becomes your first Today list the moment you're in."
              : "One list every morning: leads, quotes, invoices, admin."}
        </p>
        <SignUpForm
          assessmentToken={searchParams.assessment ?? ""}
          next={next}
          initialEmail={searchParams.email ?? ""}
          initialBusiness={searchParams.business ?? ""}
          tadMode={tadMode}
        />
        <p className="mt-6 text-sm text-faint">
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-ledger font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
