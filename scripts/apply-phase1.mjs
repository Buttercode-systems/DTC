import { readFileSync, writeFileSync, rmSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function write(path, content) {
  writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`);
}

function replaceOnce(content, search, replacement, label) {
  if (!content.includes(search)) throw new Error(`Patch target not found: ${label}`);
  return content.replace(search, replacement);
}

function replaceRegex(content, pattern, replacement, label) {
  if (!pattern.test(content)) throw new Error(`Patch target not found: ${label}`);
  return content.replace(pattern, replacement);
}

// ---------------------------------------------------------------- engine: fail closed on every source read/write
let engine = read("lib/engine.ts");
engine = replaceOnce(
  engine,
`  const [{ data: leads }, { data: quotes }, { data: invoices }, { data: promises }] =
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
    ]);`,
`  const [leadsResult, quotesResult, invoicesResult, promisesResult] = await Promise.all([
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

  assertQuery(leadsResult, "load leads");
  assertQuery(quotesResult, "load quotes");
  assertQuery(invoicesResult, "load invoices");
  assertQuery(promisesResult, "load payment promises");

  const leads = leadsResult.data;
  const quotes = quotesResult.data;
  const invoices = invoicesResult.data;
  const promises = promisesResult.data;`,
  "engine source queries"
);
engine = replaceOnce(
  engine,
`      await supabase
        .from("quotes")
        .update({ status: "expired" })
        .eq("id", quote.id);`,
`      const expireResult = await supabase
        .from("quotes")
        .update({ status: "expired" })
        .eq("id", quote.id)
        .eq("business_id", businessId);
      assertQuery(expireResult, "expire quote");`,
  "quote expiry write"
);
engine = replaceOnce(
  engine,
`  const { data: recurring } = await supabase
    .from("invoices")
    .select("id, number, amount, recurring_interval, next_issue_date, customers(name)")
    .eq("business_id", businessId)
    .eq("recurring_interval", "monthly")
    .not("next_issue_date", "is", null)
    .lte("next_issue_date", todayIso);`,
`  const recurringResult = await supabase
    .from("invoices")
    .select("id, number, amount, recurring_interval, next_issue_date, customers(name)")
    .eq("business_id", businessId)
    .eq("recurring_interval", "monthly")
    .not("next_issue_date", "is", null)
    .lte("next_issue_date", todayIso);
  assertQuery(recurringResult, "load recurring invoices");
  const recurring = recurringResult.data;`,
  "recurring invoice query"
);
engine = replaceOnce(
  engine,
`  const { data: openActions } = await supabase
    .from("actions")
    .select("id, key, kind")
    .eq("business_id", businessId)
    .eq("status", "open")
    .in("kind", RECONCILED_KINDS);`,
`  const openActionsResult = await supabase
    .from("actions")
    .select("id, key, kind")
    .eq("business_id", businessId)
    .eq("status", "open")
    .in("kind", RECONCILED_KINDS);
  assertQuery(openActionsResult, "load open actions");
  const openActions = openActionsResult.data;`,
  "open action query"
);
engine = replaceOnce(
  engine,
`    await supabase
      .from("actions")
      .update({ status: "dismissed" })
      .in(
        "id",
        stale.map((a) => a.id)
      );`,
`    const retireResult = await supabase
      .from("actions")
      .update({ status: "dismissed" })
      .eq("business_id", businessId)
      .in(
        "id",
        stale.map((a) => a.id)
      );
    assertQuery(retireResult, "retire stale actions");`,
  "stale action retirement"
);
engine = replaceOnce(
  engine,
`  await supabase
    .from("actions")
    .update({ status: "open", snoozed_until: null })
    .eq("business_id", businessId)
    .eq("status", "snoozed")
    .lte("snoozed_until", todayIso);`,
`  const wakeResult = await supabase
    .from("actions")
    .update({ status: "open", snoozed_until: null })
    .eq("business_id", businessId)
    .eq("status", "snoozed")
    .lte("snoozed_until", todayIso);
  assertQuery(wakeResult, "wake snoozed actions");`,
  "snooze wakeup"
);
engine = replaceOnce(
  engine,
`    await supabase.from("actions").upsert(
      derived.map((d) => ({ business_id: businessId, ...d, status: "open" })),
      { onConflict: "business_id,key", ignoreDuplicates: true }
    );`,
`    const upsertResult = await supabase.from("actions").upsert(
      derived.map((d) => ({ business_id: businessId, ...d, status: "open" })),
      { onConflict: "business_id,key", ignoreDuplicates: true }
    );
    assertQuery(upsertResult, "create derived actions");`,
  "derived action upsert"
);
engine = replaceOnce(
  engine,
`function describeWait(hours: number): string {`,
`function assertQuery(result: { error: { message: string } | null }, operation: string): void {
  if (result.error) throw new Error(\`Could not \${operation}: \${result.error.message}\`);
}

function describeWait(hours: number): string {`,
  "engine error helper"
);
write("lib/engine.ts", engine);

// ------------------------------------------------------- atomic action completion
let actions = read("app/app/actions.ts");
actions = replaceRegex(
  actions,
  /export async function completeAction\(actionId: string\): Promise<void> \{[\s\S]*?\nexport async function snoozeAction/,
`export async function completeAction(actionId: string): Promise<void> {
  const { supabase, businessId } = await ctx();
  const { data, error } = await supabase.rpc("complete_action_safely", {
    p_action_id: actionId,
  });
  if (error) throw new Error(\`Could not complete action: \${error.message}\`);

  const completed = data as { kind?: string; entity_table?: string | null } | null;
  if (!completed?.kind) throw new Error("The action was not completed.");

  await trackEvent(supabase, "action_completed", {
    businessId,
    path: "/app",
    metadata: { kind: completed.kind, entity_table: completed.entity_table ?? null },
  });
  refresh();
}

export async function snoozeAction`,
  "completeAction and recurring helper"
);
write("app/app/actions.ts", actions);

const migration = `-- Complete a Today action and its linked record in one database transaction.\n-- The caller must own the action's business.\n\ncreate or replace function public.complete_action_safely(p_action_id uuid)\nreturns jsonb\nlanguage plpgsql\nsecurity definer\nset search_path to ''\nas $$\ndeclare\n  v_uid uuid := auth.uid();\n  v_action public.actions%rowtype;\n  v_template public.invoices%rowtype;\n  v_now timestamptz := now();\n  v_issued date;\n  v_due date;\n  v_next date;\n  v_number text;\nbegin\n  if v_uid is null then raise exception 'not authenticated'; end if;\n\n  select a.* into v_action\n  from public.actions a\n  join public.businesses b on b.id = a.business_id\n  where a.id = p_action_id and b.owner_id = v_uid\n  for update of a;\n\n  if v_action.id is null then raise exception 'action not found'; end if;\n  if v_action.status = 'done' then\n    return jsonb_build_object('id', v_action.id, 'kind', v_action.kind, 'entity_table', v_action.entity_table, 'already_done', true);\n  end if;\n  if v_action.status not in ('open', 'snoozed') then raise exception 'action is not completable'; end if;\n\n  if v_action.entity_id is not null then\n    case v_action.kind\n      when 'lead_response' then\n        update public.leads set status = 'responded', responded_at = v_now\n        where id = v_action.entity_id and business_id = v_action.business_id;\n        if not found then raise exception 'linked lead not found'; end if;\n      when 'quote_followup' then\n        update public.quotes set last_followup_at = v_now\n        where id = v_action.entity_id and business_id = v_action.business_id;\n        if not found then raise exception 'linked quote not found'; end if;\n      when 'invoice_chase' then\n        update public.invoices set last_chase_at = v_now\n        where id = v_action.entity_id and business_id = v_action.business_id;\n        if not found then raise exception 'linked invoice not found'; end if;\n      when 'supplier_approval' then\n        update public.invoices set status = 'approved'\n        where id = v_action.entity_id and business_id = v_action.business_id and kind = 'supplier';\n        if not found then raise exception 'linked supplier invoice not found'; end if;\n      when 'recurring_invoice' then\n        select * into v_template from public.invoices\n        where id = v_action.entity_id and business_id = v_action.business_id\n        for update;\n        if v_template.id is null or v_template.next_issue_date is null then raise exception 'recurring template not found'; end if;\n\n        v_issued := v_template.next_issue_date;\n        v_due := v_issued + 7;\n        v_next := (v_issued + interval '1 month')::date;\n        v_number := left(v_template.number || '-' || to_char(v_issued, 'YYYY-MM'), 60);\n\n        if not exists (\n          select 1 from public.invoices\n          where business_id = v_action.business_id and number = v_number\n        ) then\n          insert into public.invoices (business_id, customer_id, kind, number, description, amount, status, issued_at, due_date)\n          values (v_action.business_id, v_template.customer_id, 'customer', v_number, v_template.description, v_template.amount, 'sent', v_issued, v_due);\n        end if;\n\n        update public.invoices set next_issue_date = v_next where id = v_template.id;\n      else\n        null;\n    end case;\n  end if;\n\n  update public.actions\n  set status = 'done', completed_at = v_now, snoozed_until = null\n  where id = v_action.id;\n\n  return jsonb_build_object('id', v_action.id, 'kind', v_action.kind, 'entity_table', v_action.entity_table, 'already_done', false);\nend;\n$$;\n\nrevoke all on function public.complete_action_safely(uuid) from public;\nrevoke all on function public.complete_action_safely(uuid) from anon;\ngrant execute on function public.complete_action_safely(uuid) to authenticated;\n`;
write("supabase/migrations/0010_complete_action_safely.sql", migration);

// ------------------------------------------------------- disable unconfigured automation surfaces
let nav = read("components/NavLinks.tsx");
nav = nav.replace('  { href: "/app/brief", label: "Brief" },\n', "");
nav = nav.replace('  { href: "/app/automation", label: "Automation" },\n', "");
write("components/NavLinks.tsx", nav);

const disabledPage = (title, eyebrow, description) => `import Link from "next/link";\n\nexport const metadata = { title: "${title} — DueToday" };\n\nexport default function DisabledPilotFeaturePage() {\n  return (\n    <div className="mx-auto max-w-2xl space-y-6">\n      <div className="border border-rule bg-card p-6 shadow-card">\n        <p className="eyebrow mb-2">${eyebrow}</p>\n        <h1 className="font-display text-3xl">Not enabled during the controlled pilot</h1>\n        <p className="mt-3 text-sm leading-6 text-faint">${description}</p>\n      </div>\n      <div className="border border-rule p-5 text-sm text-faint">\n        <p className="font-semibold text-ink">Current safe boundary</p>\n        <p className="mt-2">DueToday is manual-first: add records, open Today, use the prepared draft, and record the result yourself. No scheduled sync, brief, or customer delivery is running.</p>\n      </div>\n      <Link href="/app" className="btn-primary inline-block">Return to Today</Link>\n    </div>\n  );\n}\n`;
write("app/app/brief/page.tsx", disabledPage("Daily Brief", "Pilot boundary", "Scheduled and test-email briefs are hidden until delivery credentials, monitoring, and end-to-end verification are complete."));
write("app/app/automation/page.tsx", disabledPage("Automation", "Pilot boundary", "Source automation and autopilot controls are hidden until the production scheduler and required secrets are configured and verified."));
write("app/api/cron/owner-daily-briefs/route.ts", `export const dynamic = "force-dynamic";\n\nexport async function GET() {\n  return Response.json(\n    { ok: false, error: "automation_disabled_during_controlled_pilot" },\n    { status: 503 }\n  );\n}\n`);

const vercel = JSON.parse(read("vercel.json"));
delete vercel.crons;
write("vercel.json", JSON.stringify(vercel, null, 2));

let readme = read("README.md");
if (!readme.includes("## Controlled pilot boundary")) {
  readme += `\n## Controlled pilot boundary\n\nScheduled briefs, source autopilot and customer delivery are intentionally disabled in production until credentials, monitoring and end-to-end delivery checks exist. The current pilot is manual-first: records feed Today actions, and the owner performs and records every external action.\n`;
}
write("README.md", readme);

rmSync("scripts/apply-phase1.mjs");
rmSync(".github/workflows/phase1-apply.yml");
console.log("DTC Phase 1 blockers patched.");
