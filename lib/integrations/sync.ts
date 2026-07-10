import type { SupabaseClient } from "@supabase/supabase-js";
import { isoDate } from "@/lib/format";
import { parseImportText, type ImportKind, type ParsedMoneyRow } from "@/lib/import-money";
import { runEngine, type BusinessSettings } from "@/lib/engine";
import { validGoogleAccessToken } from "./google";

type SourceConnection = {
  id: string;
  business_id: string;
  source_type: "google_sheets" | "gmail" | string;
  display_name: string;
  status: string;
  config: Record<string, unknown> | null;
};

type SyncResult = {
  ok: boolean;
  source_type: string;
  records_seen: number;
  records_created: number;
  records_updated: number;
  actions_created: number;
  error?: string;
};

type GmailMessageList = { messages?: Array<{ id: string; threadId: string }> };
type GmailMessage = {
  id: string;
  snippet?: string;
  payload?: { headers?: Array<{ name: string; value: string }> };
};

export async function syncConnectionById(
  supabase: SupabaseClient,
  connectionId: string,
  options: { businessId?: string; runType?: "manual" | "scheduled" | "system" } = {}
): Promise<SyncResult> {
  const { data: connection, error } = await supabase
    .from("source_connections")
    .select("id, business_id, source_type, display_name, status, config")
    .eq("id", connectionId)
    .maybeSingle();

  if (error || !connection) {
    return { ok: false, source_type: "unknown", records_seen: 0, records_created: 0, records_updated: 0, actions_created: 0, error: error?.message ?? "connection_not_found" };
  }
  if (options.businessId && connection.business_id !== options.businessId) {
    return { ok: false, source_type: connection.source_type, records_seen: 0, records_created: 0, records_updated: 0, actions_created: 0, error: "connection_not_in_business" };
  }
  if (connection.status !== "active") {
    return { ok: false, source_type: connection.source_type, records_seen: 0, records_created: 0, records_updated: 0, actions_created: 0, error: "connection_not_active" };
  }

  const runId = await createSyncRun(supabase, connection, options.runType ?? "manual");
  try {
    const result = connection.source_type === "google_sheets"
      ? await syncGoogleSheets(supabase, connection)
      : connection.source_type === "gmail"
        ? await syncGmail(supabase, connection)
        : { ok: false, source_type: connection.source_type, records_seen: 0, records_created: 0, records_updated: 0, actions_created: 0, error: "unsupported_source" };

    await finishSyncRun(supabase, runId, result);
    await supabase
      .from("source_connections")
      .update({
        last_synced_at: result.ok ? new Date().toISOString() : connection.status === "active" ? undefined : null,
        last_error: result.ok ? null : result.error ?? "sync_failed",
        status: result.ok ? "active" : "needs_attention",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync_failed";
    const failed = { ok: false, source_type: connection.source_type, records_seen: 0, records_created: 0, records_updated: 0, actions_created: 0, error: message };
    await finishSyncRun(supabase, runId, failed);
    await supabase.from("source_connections").update({ status: "needs_attention", last_error: message, updated_at: new Date().toISOString() }).eq("id", connection.id);
    return failed;
  }
}

export async function syncActiveSourcesForBusiness(
  supabase: SupabaseClient,
  businessId: string,
  options: { runType?: "manual" | "scheduled" | "system" } = {}
): Promise<SyncResult[]> {
  const { data: connections } = await supabase
    .from("source_connections")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "active")
    .in("source_type", ["google_sheets", "gmail"]);

  const results: SyncResult[] = [];
  for (const connection of connections ?? []) {
    results.push(await syncConnectionById(supabase, connection.id, { businessId, runType: options.runType ?? "scheduled" }));
  }
  return results;
}

async function syncGoogleSheets(supabase: SupabaseClient, connection: SourceConnection): Promise<SyncResult> {
  const accessToken = await validGoogleAccessToken(supabase, connection.id);
  if (!accessToken) throw new Error("google_reconnect_required");

  const config = connection.config ?? {};
  const spreadsheetId = cleanConfig(config.spreadsheet_id);
  const range = cleanConfig(config.range) || "Sheet1!A:F";
  const kind: ImportKind = config.import_kind === "invoices" ? "invoices" : "quotes";
  if (!spreadsheetId) throw new Error("missing_spreadsheet_id");

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`sheets_fetch_failed_${response.status}`);

  const data = (await response.json()) as { values?: string[][] };
  const csv = rowsToCsv(data.values ?? []);
  const rows = parseImportText(csv, kind).filter((row) => row.errors.length === 0);
  const before = await actionCount(supabase, connection.business_id);
  const { imported, skipped } = await importMoneyRows(supabase, connection, rows, kind);

  const settings = await businessSettings(supabase, connection.business_id);
  await runEngine(supabase, connection.business_id, settings);
  const after = await actionCount(supabase, connection.business_id);

  return {
    ok: true,
    source_type: connection.source_type,
    records_seen: rows.length,
    records_created: imported,
    records_updated: skipped,
    actions_created: Math.max(0, after - before),
  };
}

async function syncGmail(supabase: SupabaseClient, connection: SourceConnection): Promise<SyncResult> {
  const accessToken = await validGoogleAccessToken(supabase, connection.id);
  if (!accessToken) throw new Error("google_reconnect_required");

  const config = connection.config ?? {};
  const query = cleanConfig(config.gmail_query) || "newer_than:14d (inquiry OR enquiry OR quote OR invoice OR payment)";
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=${encodeURIComponent(query)}`;
  const listResponse = await fetch(listUrl, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!listResponse.ok) throw new Error(`gmail_list_failed_${listResponse.status}`);

  const list = (await listResponse.json()) as GmailMessageList;
  const before = await actionCount(supabase, connection.business_id);
  let seen = 0;
  let created = 0;
  for (const item of list.messages ?? []) {
    seen++;
    const inserted = await importGmailMessage(supabase, connection, accessToken, item.id);
    if (inserted) created++;
  }

  const settings = await businessSettings(supabase, connection.business_id);
  await runEngine(supabase, connection.business_id, settings);
  const after = await actionCount(supabase, connection.business_id);

  return {
    ok: true,
    source_type: connection.source_type,
    records_seen: seen,
    records_created: created,
    records_updated: 0,
    actions_created: Math.max(0, after - before),
  };
}

async function importMoneyRows(
  supabase: SupabaseClient,
  connection: SourceConnection,
  rows: ParsedMoneyRow[],
  kind: ImportKind
): Promise<{ imported: number; skipped: number }> {
  const [{ data: customers }, { data: existingQuotes }, { data: existingInvoices }] = await Promise.all([
    supabase.from("customers").select("id, name, phone").eq("business_id", connection.business_id).limit(1000),
    supabase.from("quotes").select("id, number").eq("business_id", connection.business_id).limit(2000),
    supabase.from("invoices").select("id, number").eq("business_id", connection.business_id).limit(2000),
  ]);

  const customerMap = new Map<string, string>();
  for (const customer of customers ?? []) customerMap.set(normalizeKey(customer.name), customer.id);
  const existingNumbers = new Set((kind === "quotes" ? existingQuotes ?? [] : existingInvoices ?? []).map((r) => normalizeKey(r.number)));

  let imported = 0;
  let skipped = 0;
  for (const row of rows) {
    const externalId = `${kind}:${normalizeKey(row.number)}`;
    const key = normalizeKey(row.number);
    if (!key || existingNumbers.has(key) || (await eventExists(supabase, connection, externalId))) {
      skipped++;
      continue;
    }

    const customerId = await ensureCustomer(supabase, connection.business_id, customerMap, row);
    const entityId = kind === "quotes"
      ? await insertQuote(supabase, connection.business_id, customerId, row)
      : await insertInvoice(supabase, connection.business_id, customerId, row);

    await recordImportEvent(supabase, connection, externalId, kind === "quotes" ? "quotes" : "invoices", entityId, {
      number: row.number,
      customer: row.customerName,
      amount: row.amount,
    });
    existingNumbers.add(key);
    imported++;
  }
  return { imported, skipped };
}

async function importGmailMessage(
  supabase: SupabaseClient,
  connection: SourceConnection,
  accessToken: string,
  messageId: string
): Promise<boolean> {
  if (await eventExists(supabase, connection, `gmail:${messageId}`)) return false;

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return false;
  const message = (await response.json()) as GmailMessage;
  const headers = message.payload?.headers ?? [];
  const from = headers.find((h) => h.name.toLowerCase() === "from")?.value ?? "Unknown sender";
  const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value ?? "Email follow-up";
  const email = extractEmail(from);
  const name = from.replace(/<[^>]+>/g, "").replace(/\"/g, "").trim() || email || "Gmail lead";

  const { data: lead } = await supabase
    .from("leads")
    .insert({
      business_id: connection.business_id,
      customer_name: name.slice(0, 200),
      email,
      source: "gmail",
      notes: `${subject}\n\n${message.snippet ?? ""}`.slice(0, 1000),
    })
    .select("id")
    .single();

  await recordImportEvent(supabase, connection, `gmail:${messageId}`, "leads", lead?.id ?? null, {
    from,
    subject,
  });
  return Boolean(lead?.id);
}

async function createSyncRun(supabase: SupabaseClient, connection: SourceConnection, runType: string): Promise<string | null> {
  const { data } = await supabase
    .from("sync_runs")
    .insert({
      business_id: connection.business_id,
      source_connection_id: connection.id,
      run_type: runType,
      status: "running",
      metadata: { source_type: connection.source_type },
    })
    .select("id")
    .single();
  return data?.id ?? null;
}

async function finishSyncRun(supabase: SupabaseClient, runId: string | null, result: SyncResult): Promise<void> {
  if (!runId) return;
  await supabase
    .from("sync_runs")
    .update({
      status: result.ok ? "success" : "failed",
      finished_at: new Date().toISOString(),
      records_seen: result.records_seen,
      records_created: result.records_created,
      records_updated: result.records_updated,
      actions_created: result.actions_created,
      error_message: result.error ?? null,
    })
    .eq("id", runId);
}

async function actionCount(supabase: SupabaseClient, businessId: string): Promise<number> {
  const { count } = await supabase.from("actions").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "open");
  return count ?? 0;
}

async function businessSettings(supabase: SupabaseClient, businessId: string): Promise<BusinessSettings> {
  const { data } = await supabase.from("businesses").select("settings").eq("id", businessId).maybeSingle();
  return (data?.settings ?? {
    lead_response_hours: 4,
    quote_followup_days: 3,
    quote_expiry_days: 30,
    invoice_chase_days: [1, 7, 14],
  }) as BusinessSettings;
}

async function ensureCustomer(supabase: SupabaseClient, businessId: string, cache: Map<string, string>, row: ParsedMoneyRow): Promise<string | null> {
  const key = normalizeKey(row.customerName);
  if (!key) return null;
  const cached = cache.get(key);
  if (cached) return cached;
  const { data } = await supabase.from("customers").insert({ business_id: businessId, name: row.customerName, phone: row.phone }).select("id").single();
  if (data?.id) cache.set(key, data.id);
  return data?.id ?? null;
}

async function insertQuote(supabase: SupabaseClient, businessId: string, customerId: string | null, row: ParsedMoneyRow): Promise<string | null> {
  const sentAt = row.sentDate ? new Date(row.sentDate + "T00:00:00") : new Date();
  if (!row.sentDate) sentAt.setDate(sentAt.getDate() - Math.max(0, row.sentDaysAgo ?? 0));
  const validUntil = new Date(sentAt);
  validUntil.setDate(validUntil.getDate() + 30);
  const { data } = await supabase
    .from("quotes")
    .insert({
      business_id: businessId,
      customer_id: customerId,
      number: row.number,
      description: row.description,
      amount: row.amount,
      status: "sent",
      sent_at: sentAt.toISOString(),
      valid_until: isoDate(validUntil),
    })
    .select("id")
    .single();
  return data?.id ?? null;
}

async function insertInvoice(supabase: SupabaseClient, businessId: string, customerId: string | null, row: ParsedMoneyRow): Promise<string | null> {
  const { data } = await supabase
    .from("invoices")
    .insert({
      business_id: businessId,
      customer_id: customerId,
      kind: "customer",
      number: row.number,
      description: row.description,
      amount: row.amount,
      status: "sent",
      due_date: row.dueDate,
    })
    .select("id")
    .single();
  return data?.id ?? null;
}

async function eventExists(supabase: SupabaseClient, connection: SourceConnection, externalId: string): Promise<boolean> {
  const { data } = await supabase
    .from("source_import_events")
    .select("id")
    .eq("business_id", connection.business_id)
    .eq("source_connection_id", connection.id)
    .eq("external_id", externalId)
    .maybeSingle();
  return Boolean(data?.id);
}

async function recordImportEvent(
  supabase: SupabaseClient,
  connection: SourceConnection,
  externalId: string,
  entityTable: string,
  entityId: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  await supabase.from("source_import_events").insert({
    business_id: connection.business_id,
    source_connection_id: connection.id,
    source_type: connection.source_type,
    external_id: externalId,
    entity_table: entityTable,
    entity_id: entityId,
    metadata,
  });
}

function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string | number | boolean | null | undefined): string {
  const raw = String(value ?? "");
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function cleanConfig(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function extractEmail(value: string): string | null {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}
