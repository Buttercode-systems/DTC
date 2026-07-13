import Link from "next/link";
import { SignUpForm } from "./SignUpForm";

export const metadata = { title: "Install DueToday" };

export default function SignUpPage({
  searchParams,
}: {
  searchParams: { assessment?: string };
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-md w-full px-5 py-4">
          <Link href="/" className="font-display text-lg tracking-tight">
            Due<span className="text-ledger">Today</span>
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-md w-full px-5 py-12 flex-1">
        <h1 className="font-display text-2xl">Install your action system</h1>
        <p className="mt-2 text-faint text-sm">
          {searchParams.assessment
            ? "Your assessment becomes your first Today list the moment you're in."
            : "One list every morning: leads, quotes, invoices, admin."}
        </p>
        <SignUpForm assessmentToken={searchParams.assessment ?? ""} />
        <p className="mt-6 text-sm text-faint">
          Already installed?{" "}
          <Link href="/login" className="text-ledger font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
