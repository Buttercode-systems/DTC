import Link from "next/link";
import { SignUpForm } from "./SignUpForm";

export function generateMetadata({ searchParams }: { searchParams: { next?: string; product?: string } }) {
  const tadMode = (searchParams.next ?? "").startsWith("/portal");
  const product = searchParams.product === "tad" ? "tad" : "duetoday";
  return {
    title: tadMode
      ? "Activate Client Portal — The Admin Department"
      : product === "tad"
        ? "Create TAD workspace — The Admin Department"
        : "Install DueToday",
  };
}

export default function SignUpPage({
  searchParams,
}: {
  searchParams: { assessment?: string; next?: string; email?: string; business?: string; product?: string };
}) {
  const requestedProduct = searchParams.product === "tad" ? "tad" : "duetoday";
  const next = searchParams.next ?? (requestedProduct === "tad" ? "/app/departments" : "/app");
  const tadMode = next.startsWith("/portal");
  const product: "duetoday" | "tad" = tadMode ? "tad" : requestedProduct;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-md w-full px-5 py-4">
          {product === "tad" ? (
            <a href="https://the-admin-department.vercel.app" className="font-display text-lg tracking-tight">
              The Admin <span className="text-ledger">Department</span>
              <span className="ml-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
                {tadMode ? "Client Portal" : "TAD SaaS"}
              </span>
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
          {tadMode
            ? "Activate your Client Portal"
            : product === "tad"
              ? "Create your TAD workspace"
              : "Install your action system"}
        </h1>
        <p className="mt-2 text-faint text-sm">
          {tadMode
            ? "Use the same email address supplied to The Admin Department. Access is granted only when it matches the verified primary contact on your managed workspace."
            : product === "tad"
              ? "Run all six admin departments in one TAD SaaS workspace."
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
          product={product}
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
