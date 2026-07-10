import type { SupabaseClient } from "@supabase/supabase-js";
import { runEngine, type BusinessSettings } from "@/lib/engine";
import { isoDate, money } from "@/lib/format";

export interface DailyBrief {
  subject: string;
  text: string;
  html: string;
  actionCount: number;
  moneyCount: number;
  leadCount: number;
}

interface BriefAction {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  priority: number;
}

export async function generateDailyBrief(
  supabase: SupabaseClient,
  businessId: string,
  businessName: string,
  settings: BusinessSettings
): Promise<DailyBrief> {
  await runEngine(supabase, businessId, settings);

  const todayIso = isoDate();
  const { data } = await supabase
    .from("actions")
    .select("id, kind, title, detail, priority")
    .eq("business_id", businessId)
    .eq("status", "open")
    .lte("due_date", todayIso)
    .order("priority", { ascending: false })
    .limit(25);

  const actions = (data ?? []) as BriefAction[];
  const moneyKinds = new Set(["invoice_chase", "promise_check", "quote_followup", "quote_expired", "recurring_invoice"]);
  const moneyActions = actions.filter((a) => moneyKinds.has(a.kind));
  const leadActions = actions.filter((a) => a.kind === "lead_response");

  const subject = actions.length === 0
    ? `DueToday: ${businessName} has no money actions due today`
    : `DueToday: ${actions.length} action${actions.length === 1 ? "" : "s"} due today`;

  const intro = actions.length === 0
    ? `${businessName} has no due actions today. That either means everything is moving, or there is not enough work being tracked yet.`
    : `${businessName} has ${actions.length} action${actions.length === 1 ? "" : "s"} due today: ${moneyActions.length} money-related and ${leadActions.length} lead-related.`;

  const text = [
    intro,
    "",
    ...actions.slice(0, 10).map((a, index) => `${index + 1}. ${a.title}${a.detail ? ` — ${a.detail}` : ""}`),
    "",
    "Open DueToday and clear the list.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;max-width:640px">
      <h1 style="font-size:24px;margin:0 0 12px">DueToday</h1>
      <p>${escapeHtml(intro)}</p>
      <ul>
        ${actions
          .slice(0, 10)
          .map(
            (a) => `<li><strong>${escapeHtml(a.title)}</strong>${a.detail ? `<br><span style="color:#555">${escapeHtml(a.detail)}</span>` : ""}</li>`
          )
          .join("")}
      </ul>
      <p style="font-size:12px;color:#666">Open DueToday and clear the list. Finish the list. Go home.</p>
    </div>`;

  return {
    subject,
    text,
    html,
    actionCount: actions.length,
    moneyCount: moneyActions.length,
    leadCount: leadActions.length,
  };
}

export async function sendDailyBriefEmail({
  to,
  brief,
}: {
  to: string;
  brief: DailyBrief;
}): Promise<{ sent: boolean; status: "sent" | "not_configured" | "failed" }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DAILY_BRIEF_FROM ?? process.env.RESEND_FROM;

  if (!apiKey || !from) return { sent: false, status: "not_configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: brief.subject,
        text: brief.text,
        html: brief.html,
      }),
    });

    return { sent: response.ok, status: response.ok ? "sent" : "failed" };
  } catch {
    return { sent: false, status: "failed" };
  }
}

export function briefSummary(brief: DailyBrief): string {
  if (brief.actionCount === 0) return "No due actions today.";
  const parts = [`${brief.actionCount} due`];
  if (brief.moneyCount) parts.push(`${brief.moneyCount} money`);
  if (brief.leadCount) parts.push(`${brief.leadCount} lead`);
  return parts.join(" · ");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function importImpactText(imported: number, kind: "quotes" | "invoices", amount: number): string {
  const label = kind === "quotes" ? "open quote" : "invoice";
  return `${imported} ${label}${imported === 1 ? "" : "s"} imported${amount > 0 ? ` · ${money(amount)} tracked` : ""}`;
}
