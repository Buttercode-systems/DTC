"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="bg-card shadow-card p-8 text-center">
      <p className="font-display text-xl">Something went wrong loading this page.</p>
      <p className="mt-2 text-faint text-sm max-w-md mx-auto">
        Your data is safe — this is usually a connection hiccup. Try again in a
        moment.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-faint">Ref: {error.digest}</p>
      )}
      <button onClick={reset} className="btn-primary mt-5">
        Try again
      </button>
    </div>
  );
}
