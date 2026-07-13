"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  anchor?: boolean;
};

const PLATFORM_LINKS: NavItem[] = [
  { href: "/app", label: "Today" },
  { href: "/app/departments", label: "Departments" },
  { href: "/app/service#decisions", label: "Approvals", anchor: true },
  { href: "/app/service#reports", label: "Reports", anchor: true },
  { href: "/app/import", label: "Imports" },
  { href: "/app/account", label: "Account" },
  { href: "/app/settings", label: "Settings" },
];

export function NavLinks({ managedByTad = false }: { managedByTad?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className="flex items-center gap-4 text-sm whitespace-nowrap min-w-max sm:min-w-0"
      aria-label={managedByTad ? "TAD Managed navigation" : "TAD SaaS navigation"}
    >
      {PLATFORM_LINKS.map((link) => {
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
