"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isoDate } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { runEngine, type BusinessSettings } from "@/lib/engine";
import { parseImportText, type ImportKind, type ParsedMoneyRow } from "@/lib/import-money";
import { generateDailyBrief, sendDailyBriefEmail } from "@/lib/daily-brief";
import type { SupabaseClient } from "@supabase/supabase-js";

async function ctx(): Promise<{
  supabase: SupabaseClient;
  businessId: string;
  businessName: string;
  settings: BusinessSettings;
  userEmail: string | null;
}> {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, settings")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) throw new Error("No business found.");
  return {
    supabase,
    businessId: business.id,
    businessName: business.name,
    settings: business.settings as BusinessSettings,
    userEmail: user.email ?? null,
  };
}

function refresh() {
  revalidatePath("/app");
  revalidatePath("/app/pipeline");
  revalidatePath("/app/leads");
  revalidatePath("/app/quotes");
  revalidatePath("/app/invoices");
  revalidatePath("/app/import");
  revalidatePath("/app/brief");
  revalidatePath("/app/admin");
}

// ------------------------------------------------------- action lifecycle

export async function completeAction(actionId: string): Promise<void> {
  const { supabase, businessId } = await ctx();
  const { data, error } = await supabase.rpc("complete_action_safely", {
    p_action_id: actionId,
  });
  if (error) throw new Error(`Could not complete action: ${error.message}`);

  const completed = data as { kind?: string; entity_table?: string | null } | null;
  if (!completed?.kind) throw new Error("The action was not completed.");

  await trackEvent(supabase, "action_completed", {
    businessId,
    path: "/app",
    metadata: { kind: completed.kind, entity_table: completed.entity_table ?? null },
  });
  refresh();
}

export async function snoozeAction(actionId: string, days: number): Promise<void> {
  const { supabase, businessId } = await ctx();
  const until = new Date();
  until.setDate(until.getDate() + Math.max(1, Math.min(days, 30)));
  await supabase
    .from("actions")
    .update({ status: "snoozed", snoozed_until: isoDate(until) })
    .eq("id", actionId)
    .eq("business_id", businessId);
  await trackEvent(supabase, "action_snoozed", { businessId, path: "/app" });
  refresh();
}

export async function dismissAction(actionId: string): Promise<void> {
  const { supabase, businessId } = await ctx();
  await supabase
    .from("actions")
    .update({ status: "dismissed" })
    .eq("id", actionId)
    .eq("business_id", businessId);
  await trackEvent(supabase, "action_dismissed", { businessId, path: "/app" });
  refresh();
}

// ------------------------------------------------------------------ leads

export async function createLead(formData: FormData): Promise<void> {
  const { supabase, businessId } = await ctx();
  const name = String(formData.get("customer_name") ?? "").trim();
  if (!name) return;
  await supabase.from("leads").insert({
    business_id: businessId,
    customer_name: name.slice(0, 200),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    source: str(formData, "source"),
    notes: str(formData, "notes"),
  });
  await trackEvent(supabase, "lead_created", {
    businessId,
    path: "/app/leads",
    metadata: { source: str(formData, "source") },
  });
  refresh();
}

export async function setLeadStatus(leadId: string, status: string): Promise<void> {
  const { supabase, businessId } = await ctx();
  const allowed = ["new", "responded", "quoted", "won", "lost"];
  if (!allowed.includes(status)) return;
  const patch: Record<string, unknown> = { status };
  if (status === "responded") patch.responded_at = new Date().toISOString();
  await supabase.from("leads").update(patch).eq("id", leadId).eq("business_id", businessId);
  await trackEvent(supabase, "lead_status_changed", {
    businessId,
    path: "/app/leads",
    metadata: { status },
  });
  refresh();
}

// -------------------------------------------------------------- customers

export async function createCustomer(formData: FormData): Promise<void> {
  const { supabase, businessId } = await ctx();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await supabase.from("customers").insert({
    business_id: businessId,
    name: name.slice(0, 200),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
  });
  await trackEvent(supabase, "customer_created", { businessId, path: "/app/customers" });
  revalidatePath("/app/customers");
  refresh();
}

// ------------------------------------------------------------------ quotes

export async function createQuote(formData: FormData): Promise<void> {
  const { supabase, businessId } = await ctx();
  const number = String(formData.get("number") ?? "").trim();
  const amount = num(formData, "amount");
  if (!number) return;
  const sentDaysAgo = num(formData, "sent_days_ago") ?? 0;
  const sentAt = new Date();
  sentAt.setDate(sentAt.getDate() - Math.max(0, sentDaysAgo));
  const validUntil = new Date(sentAt);
  validUntil.setDate(validUntil.getDate() + 30);

  await supabase.from("quotes").insert({
    business_id: businessId,
    customer_id: str(formData, "customer_id"),
    number: number.slice(0, 60),
    description: str(formData, "description"),
    amount: amount ?? 0,
    status: "sent",
    sent_at: sentAt.toISOString(),
    valid_until: isoDate(validUntil),
  });
  await trackEvent(supabase, "quote_created", {
    businessId,
    path: "/app/quotes",
    metadata: { amount: amount ?? 0, sent_days_ago: sentDaysAgo },
  });
  refresh();
}

export async function setQuoteStatus(quoteId: string, status: string): Promise<void> {
  const { supabase, businessId } = await ctx();
  if (!["sent", "accepted", "declined", "expired"].includes(status)) return;
  await supabase.from("quotes").update({ status }).eq("id", quoteId).eq("business_id", businessId);
  await trackEvent(supabase, "quote_status_changed", {
    businessId,
    path: "/app/quotes",
    metadata: { status },
  });
  refresh();
}

// ---------------------------------------------------------------- invoices

export async function createInvoice(formData: FormData): Promise<void> {
  const { supabase, businessId } = await ctx();
  const number = String(formData.get("number") ?? "").trim();
  if (!number) return;
  const kind = String(formData.get("kind") ?? "customer");
  const recurring = String(formData.get("recurring") ?? "") === "monthly";
  const dueDate = str(formData, "due_date");
  const nextIssue = recurring
    ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return isoDate(d);
      })()
    : null;

  await supabase.from("invoices").insert({
    business_id: businessId,
    customer_id: kind === "customer" ? str(formData, "customer_id") : null,
    counterparty: kind === "supplier" ? str(formData, "counterparty") : null,
    kind: kind === "supplier" ? "supplier" : "customer",
    number: number.slice(0, 60),
    description: str(formData, "description"),
    amount: num(formData, "amount") ?? 0,
    status: "sent",
    due_date: dueDate,
    recurring_interval: recurring ? "monthly" : null,
    next_issue_date: nextIssue,
  });
  await trackEvent(supabase, "invoice_created", {
    businessId,
    path: "/app/invoices",
    metadata: { kind, recurring, amount: num(formData, "amount") ?? 0 },
  });
  refresh();
}

export async function markInvoicePaid(invoiceId: string): Promise<void> {
  const { supabase, businessId } = await ctx();
  await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("business_id", businessId);
  await supabase
    .from("payment_promises")
    .update({ kept: true })
    .eq("invoice_id", invoiceId)
    .eq("business_id", businessId)
    .is("kept", null);
  await trackEvent(supabase, "invoice_paid", { businessId, path: "/app/invoices" });
  refresh();
}

export async function recordPromise(formData: FormData): Promise<void> {
  const { supabase, businessId } = await ctx();
  const invoiceId = str(formData, "invoice_id");
  const promisedDate = str(formData, "promised_date");
  if (!invoiceId || !promisedDate) return;
  await supabase.from("payment_promises").insert({
    business_id: businessId,
    invoice_id: invoiceId,
    promised_date: promisedDate,
    amount: num(formData, "amount"),
    note: str(formData, "note"),
  });
  await trackEvent(supabase, "payment_promise_recorded", { businessId, path: "/app/invoices" });
  refresh();
}

// ------------------------------------------------------------------ import

export async function importMoneyItems(formData: FormData): Promise<void> {
  const { supabase, businessId, settings } = await ctx();
  const kind = String(formData.get("kind") ?? "quotes") === "invoices" ? "invoices" : "quotes";
  const text = String(formData.get("import_text") ?? "");
  const rows = parseImportText(text, kind as ImportKind).filter((row) => row.errors.length === 0);

  if (rows.length === 0) redirect(`/app/import?type=${kind}&imported=0&skipped=0&error=no_valid_rows`);

  const [{ data: customers }, { data: existingQuotes }, { data: existingInvoices }] = await Promise.all([
    supabase.from("customers").select("id, name, phone").eq("business_id", businessId).limit(1000),
    supabase.from("quotes").select("number").eq("business_id", businessId).limit(1000),
    supabase.from("invoices").select("number").eq("business_id", businessId).limit(1000),
  ]);

  const customerMap = new Map<string, string>();
  for (const customer of customers ?? []) customerMap.set(normalizeKey(customer.name), customer.id);

  const existingNumbers = new Set(
    (kind === "quotes" ? existingQuotes ?? [] : existingInvoices ?? []).map((r) => normalizeKey(r.number))
  );

  let imported = 0;
  let skipped = 0;
  let totalAmount = 0;

  for (const row of rows) {
    const key = normalizeKey(row.number);
    if (!key || existingNumbers.has(key)) {
      skipped++;
      continue;
    }

    const customerId = await ensureCustomer(supabase, businessId, customerMap, row);
    if (kind === "quotes") {
      const sentAt = sentDateFromRow(row);
      const validUntil = new Date(sentAt);
      validUntil.setDate(validUntil.getDate() + settings.quote_expiry_days);
      await supabase.from("quotes").insert({
        business_id: businessId,
        customer_id: customerId,
        number: row.number,
        description: row.description,
        amount: row.amount,
        status: "sent",
        sent_at: sentAt.toISOString(),
        valid_until: isoDate(validUntil),
      });
    } else {
      await supabase.from("invoices").insert({
        business_id: businessId,
        customer_id: customerId,
        kind: "customer",
        number: row.number,
        description: row.description,
        amount: row.amount,
        status: "sent",
        due_date: row.dueDate,
      });
    }

    existingNumbers.add(key);
    imported++;
    totalAmount += row.amount;
  }

  await runEngine(supabase, businessId, settings);
  await trackEvent(supabase, "money_import_completed", {
    businessId,
    path: "/app/import",
    metadata: { kind, imported, skipped, amount: totalAmount },
  });
  refresh();
  redirect(`/app/import?type=${kind}&imported=${imported}&skipped=${skipped}&amount=${Math.round(totalAmount)}`);
}

async function ensureCustomer(
  supabase: SupabaseClient,
  businessId: string,
  cache: Map<string, string>,
  row: ParsedMoneyRow
): Promise<string | null> {
  const key = normalizeKey(row.customerName);
  if (!key) return null;
  const cached = cache.get(key);
  if (cached) return cached;

  const { data } = await supabase
    .from("customers")
    .insert({ business_id: businessId, name: row.customerName, phone: row.phone })
    .select("id")
    .single();

  if (data?.id) cache.set(key, data.id);
  return data?.id ?? null;
}

function sentDateFromRow(row: ParsedMoneyRow): Date {
  if (row.sentDate) return new Date(row.sentDate + "T00:00:00");
  const d = new Date();
  d.setDate(d.getDate() - Math.max(0, row.sentDaysAgo ?? 0));
  return d;
}

// -------------------------------------------------------------- daily brief

export async function sendDailyBriefTest(): Promise<void> {
  const { supabase, businessId, businessName, settings, userEmail } = await ctx();
  const brief = await generateDailyBrief(supabase, businessId, businessName, settings);

  if (!userEmail) redirect("/app/brief?sent=failed&reason=no_email");

  const result = await sendDailyBriefEmail({ to: userEmail, brief });
  await trackEvent(supabase, "daily_brief_tested", {
    businessId,
    path: "/app/brief",
    metadata: { status: result.status, action_count: brief.actionCount },
  });
  refresh();
  redirect(`/app/brief?sent=${result.status}&actions=${brief.actionCount}`);
}

// ---------------------------------------------------------------- feedback

export async function submitFeedback(formData: FormData): Promise<void> {
  const { supabase, businessId } = await ctx();
  const message = String(formData.get("message") ?? "").trim();
  if (message.length < 3) return;

  const kind = String(formData.get("kind") ?? "general");
  const allowed = ["general", "bug", "confusing", "idea", "would_pay", "would_not_pay"];
  const rating = num(formData, "rating");

  await supabase.from("soft_launch_feedback").insert({
    business_id: businessId,
    kind: allowed.includes(kind) ? kind : "general",
    rating: rating ? clamp(rating, 1, 5) : null,
    page: str(formData, "page"),
    email: str(formData, "email"),
    message: message.slice(0, 2000),
  });
  await trackEvent(supabase, "feedback_submitted", {
    businessId,
    path: str(formData, "page"),
    metadata: { kind: allowed.includes(kind) ? kind : "general", rating: rating ?? null },
  });
  revalidatePath("/app/admin");
}

// ---------------------------------------------------------------- settings

export async function updateSettings(formData: FormData): Promise<void> {
  const { supabase, businessId } = await ctx();
  const settings = {
    lead_response_hours: clamp(num(formData, "lead_response_hours") ?? 4, 1, 72),
    quote_followup_days: clamp(num(formData, "quote_followup_days") ?? 3, 1, 30),
    quote_expiry_days: clamp(num(formData, "quote_expiry_days") ?? 30, 7, 365),
    invoice_chase_days: [1, 7, 14],
  };
  const name = String(formData.get("name") ?? "").trim();
  const patch: Record<string, unknown> = { settings };
  if (name) patch.name = name.slice(0, 200);
  await supabase.from("businesses").update(patch).eq("id", businessId);
  await trackEvent(supabase, "settings_updated", { businessId, path: "/app/settings" });
  revalidatePath("/app/settings");
  refresh();
}

// ------------------------------------------------------------------ utils

function str(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v ? v.slice(0, 500) : null;
}

function num(formData: FormData, key: string): number | null {
  const v = parseFloat(String(formData.get(key) ?? ""));
  return isNaN(v) ? null : v;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function normalizeKey(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}
