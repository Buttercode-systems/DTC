import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in — DueToday" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
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
        <h1 className="font-display text-2xl">Sign in</h1>
        <p className="mt-2 text-faint text-sm">Your list is waiting.</p>
        <LoginForm next={searchParams.next ?? "/app"} error={searchParams.error} />
        <p className="mt-6 text-sm text-faint">
          New here?{" "}
          <Link href="/assessment" className="text-ledger font-semibold">
            Start with the free assessment
          </Link>
        </p>
      </div>
    </main>
  );
}
