// ---------------------------------------------------------------------------
// The DueToday action engine.
//
// Every rule answers one question: "What must happen today so this business
// gets paid?" The engine reads record state, derives today's required
// actions, and reconciles: actions whose condition has passed are retired,
// actions whose condition holds are created exactly once (idempotent via a
// deterministic key), and priorities escalate as items age.
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import { daysBetween, isoDate, money, startOfToday } from "./format";

export interface BusinessSettings {
  lead_response_hours: number;
  quote_followup_days: number;
  quote_expiry_days: number;
  invoice_chase_days: number[];
}

interface DerivedAction {
  key: string;
  kind: string;
  title: string;
  detail: string | null;
  priority: number;
  entity_table: string | null;
  entity_id: string | null;
  contact_phone: string | null;
  due_date: string;
}

const RECONCILED_KINDS = [
  "lead_response",
  "quote_followup",
  "invoice_chase",
  "supplier_approval",
  "promise_check",
  "recurring_invoice",
];

export async function runEngine(
  supabase: SupabaseClient,
  businessId: string,
  settings: BusinessSettings
): Promise<void> {
  const today = startOfToday();
  const todayIso = isoDate(today);
  const derived: DerivedAction[] = [];

  const [{ data: leads }, { data: quotes }, { data: invoices }, { data: promises }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, customer_name, phone, received_at, status")
        .eq("business_id", businessId)
        .eq("status", "new"),
      supabase
        .from("quotes")
        .select(
          "id, number, amount, status, sent_at, valid_until, last_followup_at, customers(name, phone)"
        )
        .eq("business_id", businessId)
        .in("status", ["sent"]),
      supabase
        .from("invoices")
        .select(
          "id, number, amount, kind, counterparty, status, due_date, last_chase_at, recurring_interval, next_issue_date, customers(name, phone)"
        )
        .eq("business_id", businessId)
        .in("status", ["sent"]),
      supabase
        .from("payment_promises")
        .select(
          "id, promised_date, amount, kept, invoices(id, number, status, customers(name, phone))"
        )
        .eq("business_id", businessId)
        .is("kept", null)
        .lte("promised_date", todayIso),
    ]);

  // ---- Rule 1: every new lead must be answered ---------------------------
  for (const lead of leads ?? []) {
    const hoursWaiting = Math.floor(
      (Date.now() - new Date(lead.received_at).getTime()) / 3_600_000
    );
    const late = hoursWaiting >= settings.lead_response_hours;
    derived.push({
      key: `lead_response:${lead.id}`,
      kind: "lead_response",
      title: `Reply to new lead — ${lead.customer_name}`,
      detail: late
        ? `Waiting ${describeWait(hoursWaiting)}. Every hour lowers the chance of winning this work.`
        : `Arrived ${describeWait(hoursWaiting)} ago. Reply before it goes cold.`,
      priority: 80 + Math.min(hoursWaiting, 40),
      entity_table: "leads",
      entity_id: lead.id,
      contact_phone: lead.phone,
      due_date: todayIso,
    });
  }

  // ---- Rule 2 & 3: quotes get followed until decided; stale quotes expire
  for (const quote of quotes ?? []) {
    const customer = one(quote.customers);
    if (quote.valid_until && new Date(quote.valid_until + "T00:00:00") < today) {
      await supabase
        .from("quotes")
        .update({ status: "expired" })
        .eq("id", quote.id);
      derived.push({
        key: `quote_expired:${quote.id}`,
        kind: "quote_expired",
        title: `Decide on expired Quote #${quote.number}${customer ? ` — ${customer.name}` : ""}`,
        detail: `${money(quote.amount)} expired unanswered. Re-quote it or close it — don't let it vanish silently.`,
        priority: 60,
        entity_table: "quotes",
        entity_id: quote.id,
        contact_phone: customer?.phone ?? null,
        due_date: todayIso,
      });
      continue;
    }
    const anchor = quote.last_followup_at ?? quote.sent_at;
    if (!anchor) continue;
    const daysSince = daysBetween(today, new Date(anchor));
    if (daysSince >= settings.quote_followup_days) {
      const age = quote.sent_at ? daysBetween(today, new Date(quote.sent_at)) : daysSince;
      derived.push({
        key: `quote_followup:${quote.id}:${todayIso}`,
        kind: "quote_followup",
        title: `Follow up Quote #${quote.number}${customer ? ` — ${customer.name}` : ""}`,
        detail: `${money(quote.amount)}, sent ${age} day${age === 1 ? "" : "s"} ago. Call, ask for a decision, set the next step.`,
        priority: 70 + Math.min(age, 25),
        entity_table: "quotes",
        entity_id: quote.id,
        contact_phone: customer?.phone ?? null,
        due_date: todayIso,
      });
    }
  }

  // ---- Rules 4–6: invoices ----------------------------------------------
  for (const inv of invoices ?? []) {
    const customer = one(inv.customers);

    if (inv.kind === "supplier") {
      // Rule 5: supplier invoices awaiting approval never sit in a pile.
      derived.push({
        key: `supplier_approval:${inv.id}`,
        kind: "supplier_approval",
        title: `Approve supplier invoice #${inv.number}${inv.counterparty ? ` — ${inv.counterparty}` : ""}`,
        detail: `${money(inv.amount)} waiting for approval${inv.due_date ? `, due ${inv.due_date}` : ""}.`,
        priority: 40,
        entity_table: "invoices",
        entity_id: inv.id,
        contact_phone: null,
        due_date: todayIso,
      });
      continue;
    }

    // Rule 4: overdue customer invoices are chased on the chase schedule,
    // then daily once past the final stage.
    if (inv.due_date && new Date(inv.due_date + "T00:00:00") < today) {
      const overdue = daysBetween(today, new Date(inv.due_date + "T00:00:00"));
      const stages = [...settings.invoice_chase_days].sort((a, b) => a - b);
      const lastStage = stages[stages.length - 1] ?? 14;
      const stage =
        overdue > lastStage
          ? `daily:${todayIso}`
          : String(stages.filter((s) => s <= overdue).pop() ?? stages[0]);
      const lastChase = inv.last_chase_at
        ? daysBetween(today, new Date(inv.last_chase_at))
        : Infinity;
      // Don't nag twice in one day if a chase was already logged today.
      if (lastChase >= 1) {
        derived.push({
          key: `invoice_chase:${inv.id}:${stage}`,
          kind: "invoice_chase",
          title: `Chase Invoice #${inv.number}${customer ? ` — ${customer.name}` : ""} (${overdue} day${overdue === 1 ? "" : "s"} overdue)`,
          detail: `${money(inv.amount)} outstanding. Phone first, confirm in writing, and log any promise to pay with a date.`,
          priority: 85 + Math.min(overdue, 60),
          entity_table: "invoices",
          entity_id: inv.id,
          contact_phone: customer?.phone ?? null,
          due_date: todayIso,
        });
      }
    }
  }

  // Rule 6: recurring invoices are issued on their date, never from memory.
  const { data: recurring } = await supabase
    .from("invoices")
    .select("id, number, amount, recurring_interval, next_issue_date, customers(name)")
    .eq("business_id", businessId)
    .eq("recurring_interval", "monthly")
    .not("next_issue_date", "is", null)
    .lte("next_issue_date", todayIso);

  for (const inv of recurring ?? []) {
    const customer = one(inv.customers);
    derived.push({
      key: `recurring_invoice:${inv.id}:${inv.next_issue_date}`,
      kind: "recurring_invoice",
      title: `Issue recurring invoice${customer ? ` — ${customer.name}` : ""}`,
      detail: `${money(inv.amount)} due to be issued (based on #${inv.number}). Completing this creates and sends the next invoice.`,
      priority: 65,
      entity_table: "invoices",
      entity_id: inv.id,
      contact_phone: null,
      due_date: inv.next_issue_date,
    });
  }

  // ---- Rule 7: payment promises resurface the day they fall due ----------
  for (const p of promises ?? []) {
    const inv = one(p.invoices);
    if (!inv || inv.status === "paid") continue;
    const customer = one(inv.customers);
    derived.push({
      key: `promise_check:${p.id}`,
      kind: "promise_check",
      title: `Check promised payment${customer ? ` — ${customer.name}` : ""} (Invoice #${inv.number})`,
      detail: `${p.amount ? money(p.amount) + " " : ""}promised by ${p.promised_date}. Confirm it arrived — or chase, today.`,
      priority: 90,
      entity_table: "payment_promises",
      entity_id: p.id,
      contact_phone: customer?.phone ?? null,
      due_date: todayIso,
    });
  }

  // ---- Reconcile ----------------------------------------------------------
  // Retire open actions of engine-managed kinds whose condition no longer
  // holds (lead answered elsewhere, invoice paid, quote accepted…).
  const validKeys = new Set(derived.map((d) => d.key));
  const { data: openActions } = await supabase
    .from("actions")
    .select("id, key, kind")
    .eq("business_id", businessId)
    .eq("status", "open")
    .in("kind", RECONCILED_KINDS);

  const stale = (openActions ?? []).filter((a) => !validKeys.has(a.key));
  if (stale.length > 0) {
    await supabase
      .from("actions")
      .update({ status: "dismissed" })
      .in(
        "id",
        stale.map((a) => a.id)
      );
  }

  // Wake snoozed actions whose snooze has lapsed and condition still holds.
  await supabase
    .from("actions")
    .update({ status: "open", snoozed_until: null })
    .eq("business_id", businessId)
    .eq("status", "snoozed")
    .lte("snoozed_until", todayIso);

  // Insert new actions exactly once. Existing keys keep their status
  // (done/dismissed/snoozed are respected — the engine never re-nags).
  if (derived.length > 0) {
    await supabase.from("actions").upsert(
      derived.map((d) => ({ business_id: businessId, ...d, status: "open" })),
      { onConflict: "business_id,key", ignoreDuplicates: true }
    );
  }
}

function describeWait(hours: number): string {
  if (hours < 1) return "under an hour";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** Supabase returns to-one embeds as object or single-element array. */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
