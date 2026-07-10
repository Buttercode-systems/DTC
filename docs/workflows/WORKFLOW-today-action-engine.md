# WORKFLOW — Today Action Engine

Date: 2026-07-09
Status: Approved

## Purpose

Turn business records into one due Today action queue without creating duplicate nags.

## Code evidence

```text
lib/engine.ts
app/app/actions.ts
lib/daily-brief.ts
```

## Trigger

Current triggers:

```text
/app page load or app data refresh
/app/import save
/app/brief generation
record create/update flows that refresh app state
```

Future triggers:

```text
scheduled daily brief job
source sync job
external adapter event
```

## Primary actor

```text
System, triggered by owner activity today.
```

## Happy path

```text
1. Workflow receives supabase client, businessId and business settings.
2. Engine calculates today.
3. Engine reads new leads.
4. Engine reads sent quotes.
5. Engine reads sent invoices.
6. Engine reads due payment promises.
7. Engine derives lead_response actions for new leads.
8. Engine expires stale quotes when valid_until has passed.
9. Engine derives quote_followup actions for sent quotes past follow-up threshold.
10. Engine derives invoice_chase actions for overdue customer invoices.
11. Engine derives supplier_approval actions for supplier invoices.
12. Engine derives recurring_invoice actions when next_issue_date is due.
13. Engine derives promise_check actions when payment promise is due.
14. Engine dismisses stale open actions whose condition no longer holds.
15. Engine wakes snoozed actions whose snooze has lapsed.
16. Engine upserts derived actions with deterministic business_id + key.
17. Existing done/dismissed/snoozed action keys are respected.
```

## Derived action kinds

```text
lead_response
quote_followup
quote_expired
invoice_chase
supplier_approval
promise_check
recurring_invoice
```

## Input failures

| Failure | Current behavior | Required future behavior |
|---|---|---|
| Missing settings | caller may fail | ensure default settings always exist |
| Bad dates | may skip or create unexpected timing | validate at record creation/import |
| Missing customer phone | action still created without contact_phone | keep |
| Missing amount | money displays zero | validate before insert where possible |

## Timeout/transient failures

| Failure | Current behavior | Future behavior |
|---|---|---|
| Query timeout | no explicit engine-level catch | caller logs sync_runs/action_audit later |
| Upsert timeout | no explicit retry | future job runner retries with idempotency |

## Permanent failures

| Failure | Current behavior | Future behavior |
|---|---|---|
| Missing actions unique constraint | duplicates possible | migration health check required |
| Missing table/RLS block | engine fails | deployment/migration gate |
| Invalid business_id | no rows or errors | keep owner isolation |

## Partial failures

```text
Engine mutates quote status to expired before action upsert.
If later upsert fails, quote may be expired without action.
Future improvement: wrap status changes + upsert in a server-side RPC or add audit/retry.
```

## Concurrent conflicts

```text
Multiple engine runs can happen from multiple tabs/import/brief.
The deterministic key upsert with onConflict business_id,key is the current dedupe control.
```

## Observable states

Owner sees:

```text
open actions in /app
snoozed actions returning when due
stale actions disappearing after records change
```

Database sees:

```text
actions inserted with deterministic key
stale open actions dismissed
snoozed actions reopened
quote statuses updated to expired when due
```

Operator sees:

```text
analytics events from the calling workflow, not engine-specific logs yet
```

## Handoff contract

```text
HANDOFF: Caller -> runEngine
PAYLOAD: { supabase, businessId, settings }
SUCCESS RESPONSE: actions reconciled in database
FAILURE RESPONSE: thrown/query error or silent missing data depending on Supabase response
TIMEOUT: platform default
ON FAILURE: caller should record failure in sync_runs/action_audit_log in future job flows
AUDIT EVENT: missing today; future engine_run_completed / engine_run_failed
```

## Idempotency contract

Current idempotency key format examples:

```text
lead_response:{lead_id}
quote_followup:{quote_id}:{today}
invoice_chase:{invoice_id}:{stage}
supplier_approval:{invoice_id}
promise_check:{promise_id}
recurring_invoice:{invoice_id}:{next_issue_date}
```

Required invariant:

```text
Same business + same condition must create no more than one active action key.
```

## QA requirements

```text
- New lead creates one lead_response action.
- Sent stale quote creates quote_followup action.
- Expired quote becomes expired and creates decision action.
- Overdue invoice creates invoice_chase action.
- Supplier invoice creates supplier_approval action.
- Due payment promise creates promise_check action.
- Running engine twice does not duplicate actions.
- Paid invoice retires/dismisses invoice_chase action.
- Snoozed action reopens when snooze date lapses.
```

## Status

```text
Approved for current implementation.
Needs idempotency and partial-failure tests before scheduler use.
```
