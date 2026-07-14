"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  anchor?: boolean;
};

const DUETODAY_LINKS: NavItem[] = [
  { href: "/app", label: "Today" },
  { href: "/app/report", label: "Report" },
  { href: "/app/pipeline", label: "Pipeline" },
  { href: "/app/leads", label: "Leads" },
  { href: "/app/quotes", label: "Quotes" },
  { href: "/app/invoices", label: "Invoices" },
  { href: "/app/customers", label: "Customers" },
  { href: "/app/import", label: "Import" },
  { href: "/app/settings", label: "Settings" },
];

const TAD_LINKS: NavItem[] = [
  { href: "/app", label: "Today" },
  { href: "/app/departments", label: "Departments" },
  { href: "/app/service#decisions", label: "Approvals", anchor: true },
  { href: "/app/service#reports", label: "Reports", anchor: true },
  { href: "/app/import", label: "Imports" },
  { href: "/app/team", label: "Team" },
  { href: "/app/account", label: "Account" },
  { href: "/app/settings", label: "Settings" },
];

const MANAGED_LINKS: NavItem[] = [
  { href: "/app", label: "Today" },
  { href: "/app/service", label: "Service Desk" },
  { href: "/app/service#decisions", label: "Decisions", anchor: true },
  { href: "/app/service#reports", label: "Reports", anchor: true },
  { href: "/app/account", label: "Account" },
];

export function NavLinks({
  managedByTad = false,
  platform = "duetoday",
}: {
  managedByTad?: boolean;
  platform?: "duetoday" | "tad";
}) {
  const pathname = usePathname();
  const links = managedByTad ? MANAGED_LINKS : platform === "tad" ? TAD_LINKS : DUETODAY_LINKS;
  const label = managedByTad
    ? "TAD Managed navigation"
    : platform === "tad"
      ? "TAD SaaS navigation"
      : "DueToday navigation";

  return (
    <nav
      className="flex items-center gap-4 text-sm whitespace-nowrap min-w-max sm:min-w-0"
      aria-label={label}
    >
      {links.map((link) => {
        const active = link.anchor
          ? false
          : link.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "font-semibold text-ink border-b-2 border-ledger pb-0.5 shrink-0"
                : "text-faint hover:text-ink shrink-0"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
