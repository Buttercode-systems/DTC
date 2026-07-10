"use client";

import Link from "next/link";

export default function ReportError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-center">
      <p className="font-display text-xl">Your report could not be loaded.</p>
      <p className="mt-2 text-faint text-sm max-w-md mx-auto">
        The report itself is safe — this is usually a connection hiccup, not a
        missing report. Try again in a moment.
      </p>
      <button onClick={reset} className="btn-primary mt-5">
        Try again
      </button>
      <p className="mt-4 font-mono text-xs text-faint">
        Still stuck? <Link href="/assessment" className="text-ledger hover:underline">Retake the assessment</Link>
      </p>
    </main>
  );
}
