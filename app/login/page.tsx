import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

function loginMode(next: string) {
  if (next.startsWith("/hq") || next.startsWith("/ops")) return "hq";
  if (next.startsWith("/portal") || next.startsWith("/app/service")) return "portal";
  return "duetoday";
}

function loginCopy(mode: string) {
  if (mode === "hq") return { title: "Admin HQ sign in", description: "Private operating workspace for The Admin Department team.", label: "Admin HQ" };
  if (mode === "portal") return { title: "Client Portal sign in", description: "Review decisions, workflow progress and weekly service reports.", label: "Client Portal" };
  return { title: "Sign in", description: "Your list is waiting.", label: "" };
}

export function generateMetadata({ searchParams }: { searchParams: { next?: string } }): Metadata {
  const mode = loginMode(searchParams.next ?? "/start");
  const copy = loginCopy(mode);
  return { title: `${copy.title} — ${mode === "duetoday" ? "DueToday" : "The Admin Department"}` };
}

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = searchParams.next ?? "/start";
  const mode = loginMode(next);
  const copy = loginCopy(mode);
  const tadMode = mode !== "duetoday";

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-md w-full px-5 py-4">
          {tadMode ? (
            <a href="https://the-admin-department.vercel.app" className="font-display text-lg tracking-tight">
              The Admin <span className="text-ledger">Department</span>
              <span className="ml-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">{copy.label}</span>
            </a>
          ) : (
            <Link href="/" className="font-display text-lg tracking-tight">Due<span className="text-ledger">Today</span></Link>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-md w-full px-5 py-12 flex-1">
        <h1 className="font-display text-3xl">{copy.title}</h1>
        <p className="mt-2 text-faint text-sm leading-6">{copy.description}</p>
        <LoginForm next={next} error={searchParams.error} />
        {tadMode ? (
          <p className="mt-6 text-sm text-faint">Need a managed admin service? <a href="https://the-admin-department.vercel.app/#departments" className="text-ledger font-semibold">View TAD services</a></p>
        ) : (
          <p className="mt-6 text-sm text-faint">New here? <Link href="/assessment" className="text-ledger font-semibold">Start with the free assessment</Link></p>
        )}
      </div>
    </main>
  );
}
