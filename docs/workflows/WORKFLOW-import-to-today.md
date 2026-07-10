# WORKFLOW — Import to Today

Date: 2026-07-09
Status: Approved

## Purpose

Let an owner paste open quotes or unpaid invoices, preview parsed rows, save valid records, then automatically create Today actions.

## Code evidence

```text
components/ImportWorkbench.tsx
app/app/actions.ts#importMoneyItems
lib/import-money.ts
lib/engine.ts
```

## Trigger

```text
User opens /app/import, pastes rows, previews, then clicks save.
```

## Primary actor

```text
Business owner
```

## Happy path

```text
1. User opens /app/import.
2. ImportWorkbench loads with quotes or invoices mode.
3. User pastes CSV/spreadsheet text.
4. Client parses rows with parseImportText().
5. Preview shows row count, valid count, value, and per-row status.
6. User clicks Save valid rows.
7. importMoneyItems receives form data.
8. Server parses the text again and filters valid rows.
9. Server loads existing customers, quote numbers and invoice numbers.
10. Server skips duplicates by normalized number.
11. Server creates missing customers when needed.
12. Server inserts quotes or invoices.
13. Server runs DueToday engine.
14. Server tracks money_import_completed.
15. Server refreshes app routes.
16. User is redirected back to /app/import with imported/skipped/amount summary.
17. Today now contains actions generated from imported records.
```

## Input validation failures

| Failure | Current behavior | Future improvement |
|---|---|---|
| No valid rows | redirect with error=no_valid_rows | keep |
| Missing required columns | preview row error | keep |
| Bad amount/date | preview row error | keep |
| Empty paste | save disabled/client valid=0 | keep |
| Invalid mode | defaults to quotes | keep |

## Duplicate handling

Current behavior:

```text
Existing quote/invoice numbers are loaded per business.
Imported rows with duplicate normalized number are skipped.
Duplicate count is returned in query string.
```

Future improvement:

```text
Add source external id / import batch id / sync_runs logging.
```

## Timeout/transient failures

| Failure | Current behavior | Future behavior |
|---|---|---|
| Customer lookup timeout | import may fail silently/partially depending call | create sync_runs partial/failure record |
| Insert failure on one row | currently no per-row transaction/rollback | future batch logging + row failure table |
| Engine timeout after records inserted | records remain, actions may not exist | future retry engine with sync_runs status |

## Partial failures

Current risk:

```text
Rows are inserted one by one. If an insert fails mid-loop, earlier rows may already exist.
No sync_runs row currently records partial success.
```

Required future behavior:

```text
Add sync_runs record with seen/created/skipped/action counts.
Use idempotent retry keys before scheduled/source imports.
```

## Concurrent conflicts

```text
Two tabs importing the same invoice/quote numbers may race.
Current duplicate check is application-level.
Future hardening: database unique constraint or upsert by business_id + number + kind/source.
```

## Observable states

Owner sees:

```text
preview before save
row errors
save disabled when no valid rows
import success banner
Today actions after engine run
```

Database sees:

```text
customers inserted if missing
quotes/invoices inserted
engine-generated actions inserted/upserted
analytics event money_import_completed
```

Operator sees:

```text
analytics import event
no sync_runs yet
```

## Handoff contract

```text
HANDOFF: ImportWorkbench -> importMoneyItems server action
PAYLOAD: { kind: quotes|invoices, import_text: string }
SUCCESS RESPONSE: redirect /app/import?type&imported&skipped&amount
FAILURE RESPONSE: redirect /app/import?error=no_valid_rows or unhandled server error
TIMEOUT: platform default
ON FAILURE: user retries manually today; future sync_runs failure
AUDIT EVENT: money_import_completed analytics event
```

```text
HANDOFF: importMoneyItems -> runEngine
PAYLOAD: { supabase, businessId, settings }
SUCCESS RESPONSE: Today actions reconciled
FAILURE RESPONSE: engine error/unhandled today
TIMEOUT: platform default
ON FAILURE: future sync_runs partial + retry action
AUDIT EVENT: missing today; future import_engine_run_failed
```

## QA requirements

```text
- Preview parses valid quote rows.
- Preview parses valid invoice rows.
- Invalid rows show errors before save.
- Save disabled when valid=0.
- Duplicate numbers are skipped.
- Missing customer is created once.
- Imported quote creates quote_followup action when stale.
- Imported overdue invoice creates invoice_chase action.
- Running same import twice does not duplicate records/actions.
```

## Status

```text
Approved for current implementation.
Needs sync_runs logging and idempotency hardening before source adapters reuse it.
```
