const zar = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

export function money(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return zar.format(isNaN(v) ? 0 : v);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

export function daysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0;
  return daysBetween(startOfToday(), new Date(dueDate + "T00:00:00"));
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function longDate(d: Date = new Date()): string {
  return d.toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function shortDate(s: string | Date | null | undefined): string {
  if (!s) return "—";
  const d = typeof s === "string" ? new Date(s) : s;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export function agoDays(s: string | null | undefined): string {
  if (!s) return "—";
  const days = daysBetween(new Date(), new Date(s));
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/** WhatsApp click-to-chat link. Normalises SA numbers (0xx → 27xx). */
export function whatsappLink(phone: string, message?: string): string {
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = "27" + digits.slice(1);
  const q = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${q}`;
}
