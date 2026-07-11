"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app", label: "Today" },
  { href: "/app/pipeline", label: "Pipeline" },
  { href: "/app/leads", label: "Leads" },
  { href: "/app/quotes", label: "Quotes" },
  { href: "/app/invoices", label: "Invoices" },
  { href: "/app/customers", label: "Customers" },
  { href: "/app/import", label: "Import" },
  { href: "/app/settings", label: "Settings" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-4 text-sm whitespace-nowrap min-w-max sm:min-w-0" aria-label="App navigation">
      {LINKS.map((l) => {
        const active =
          l.href === "/app" ? pathname === "/app" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              active
                ? "font-semibold text-ink border-b-2 border-ledger pb-0.5 shrink-0"
                : "text-faint hover:text-ink shrink-0"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
