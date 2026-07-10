import Link from "next/link";
import AssessmentFlow from "./AssessmentFlow";

export const metadata = { title: "Business Execution Assessment — DueToday" };

export default function AssessmentPage() {
  return (
    <main>
      <header className="border-b border-rule">
        <div className="mx-auto max-w-2xl px-5 py-4">
          <Link href="/" className="font-display text-lg tracking-tight">
            Due<span className="text-ledger">Today</span>
          </Link>
        </div>
      </header>
      <AssessmentFlow />
    </main>
  );
}
