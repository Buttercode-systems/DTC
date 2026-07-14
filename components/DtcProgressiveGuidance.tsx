"use client";

import { usePathname } from "next/navigation";
import { ProgressiveHint } from "@/components/ProgressiveHint";

const GUIDANCE: Record<string, { key: string; title: string; detail: string }> = {
  "/app": {
    key: "today-first-visit",
    title: "Today is your daily action list.",
    detail: "Add or import one real lead, quote or invoice. DueToday will surface the next money action here when it becomes due.",
  },
  "/app/leads": {
    key: "leads-first-visit",
    title: "Capture one real enquiry first.",
    detail: "New leads stay on Today until someone replies, so the first useful step is recording the person, contact details and source.",
  },
  "/app/quotes": {
    key: "quotes-first-visit",
    title: "Every open quote needs a decision.",
    detail: "Add the sent date accurately. DueToday uses it to schedule follow-up and keep the quote visible until it is won or closed.",
  },
  "/app/invoices": {
    key: "invoices-first-visit",
    title: "Due dates drive the collection workflow.",
    detail: "Add the real due date and payment status. Overdue invoices and broken promises will return to Today until resolved.",
  },
  "/app/report": {
    key: "report-first-visit",
    title: "Reports become useful after real work is tracked.",
    detail: "Complete Today actions and keep lead, quote and invoice outcomes current. The report will then show movement instead of empty totals.",
  },
};

export function DtcProgressiveGuidance({ businessId }: { businessId: string }) {
  const pathname = usePathname();
  const guidance = GUIDANCE[pathname];
  if (!guidance) return null;

  return (
    <ProgressiveHint
      businessId={businessId}
      guidanceKey={guidance.key}
      title={guidance.title}
      detail={guidance.detail}
    />
  );
}
