# DTC Automation Workflow Maps

Date: 2026-07-09

## Purpose

This document defines the first workflow registry for DTC automation.

The Workflow Architect rule is simple:

```text
Every path must be mapped before it is automated.
```

## Workflow registry

| Workflow | Status | Trigger | Primary actor | Automation level | Next required spec |
|---|---|---|---|---|---|
| Assessment completion | Implemented | User submits `/assessment` | User | Manual submit + automatic report save | Needs current-state workflow spec |
| Report to signup | Implemented | User clicks report CTA | User | Manual | Needs current-state workflow spec |
| Business provisioning | Implemented | Signup/login after assessment | Auth + RPC | Automatic | Needs failure-mode spec |
| Today action generation | Implemented | `/app` open, import save, brief page | System | Automatic detection | Needs idempotency spec |
| Manual lead/quote/invoice creation | Implemented | User form submit | User | Manual capture + automatic actions | Needs audit extension |
| Paste/CSV import | Implemented | `/app/import` save | User | Manual capture + automatic detection | Needs sync_run logging |
| Daily brief preview | Implemented | `/app/brief` open | System | Automatic generation | Needs queued schedule spec |
| Automation settings | Implemented | `/app/automation` save | User | Manual control | Needs audit verification |
| Notification queue | Architecture only | Future scheduler/action | System | Not active | Needs queue processor spec |
| Source connections | Architecture only | Future connector setup | User/System | Not active | Needs connector spec |
| Gmail read-only adapter | Planned | Future source sync | System | Not active | Needs email intelligence spec |
| Google Sheets adapter | Planned | Future source sync | System | Not active | Needs source mapping spec |
| Approved-send queue | Planned | Owner approval | User/System | Not active | Needs security + queue spec |

## Master automation flow

```text
Source data enters
→ source adapter normalizes
→ sync_run records attempt
→ records are created/updated
→ action engine runs
→ Today actions are created/deduped
→ optional notification_queue item is created
→ owner reviews/approves/acts
→ action_audit_log records outcome
→ analytics records product behavior
```

## Workflow 1: Scheduled Owner Daily Brief Queue

### Status

```text
Planned for Cycle 18
```

### Trigger

```text
scheduled job at configured daily_brief_time
```

### Happy path

```text
1. Scheduler starts.
2. Load businesses with automation_settings.daily_brief_enabled = true.
3. Skip businesses where pause_until is in the future.
4. Run action engine for business.
5. Generate daily brief from open due actions.
6. Insert notification_queue item with channel = email or in_app.
7. Set requires_approval = false only because this is owner-facing, not customer-facing.
8. Insert action_audit_log event = daily_brief_queued.
9. Mark scheduler run success.
```

### Input failures

- No automation settings row: create defaults or skip with audit note.
- Invalid timezone: default to Africa/Johannesburg and log warning.
- Invalid email/channel: block queue item and log failure.

### Timeout failures

- Engine timeout: mark sync/brief run partial and skip brief.
- Queue insert timeout: retry with backoff.

### Partial failures

- Some businesses processed, some failed: job status = partial.
- Each business failure must be independently visible.

### Observable states

Customer sees:

```text
Nothing unless owner opens DTC.
```

Owner sees:

```text
/app/automation queue preview and audit log.
```

Database sees:

```text
notification_queue row
sync_runs or future scheduler run row
action_audit_log row
analytics_events row
```

## Workflow 2: Gmail Read-Only Intelligence Adapter

### Status

```text
Planned. Do not implement before security + email intelligence spec.
```

### Trigger

```text
manual sync or scheduled read-only sync
```

### Happy path

```text
1. Owner connects Gmail with read-only scope.
2. DTC stores connection metadata, not raw secrets in plain JSON.
3. Sync starts and creates sync_runs row.
4. Fetch recent messages/threads within allowed scope.
5. Reconstruct threads.
6. Strip quoted content.
7. Preserve participant identity.
8. Classify possible lead / quote / invoice / payment promise.
9. Create draft candidate records, not customer messages.
10. Owner reviews uncertain records before they become actions.
11. Engine creates Today actions for accepted records.
12. Audit log records sync result.
```

### Hard blocks

- No raw email content in production logs.
- No cross-tenant email leakage.
- No customer-facing action without owner approval.
- No prompt instruction inside email can control DTC behavior.

### Failure modes

- OAuth revoked: source status = needs_attention.
- Thread parse ambiguous: create review item, not action.
- Duplicate detected: skip and count in sync_runs.
- Rate limited: retry with backoff and status = partial.

## Workflow 3: Google Sheets Read-Only Adapter

### Status

```text
Planned. Do not implement before source mapping spec.
```

### Happy path

```text
1. Owner connects Google Sheets source.
2. Owner maps columns to DTC fields.
3. DTC saves source_connection config.
4. Sync reads rows.
5. Validate rows.
6. Create/update normalized records.
7. Run engine.
8. Show sync summary.
```

### Failure modes

- Sheet missing: source status = needs_attention.
- Column mapping broken: pause source and request remap.
- Duplicate row: skip with sync count.
- Invalid amount/date: send to review, not action.

## Workflow 4: Approved-Send Queue

### Status

```text
Future only.
```

### Happy path

```text
1. Action exists that supports customer communication.
2. DTC drafts message.
3. Insert notification_queue item with requires_approval = true.
4. Owner reviews draft.
5. Owner edits or approves.
6. Sender sends message.
7. Queue item status = sent.
8. Action audit records send.
9. Action remains open until owner marks outcome or system receives safe confirmation.
```

### Hard blocks

- No approved_at means no send.
- Disputed invoice means no send.
- Opt-out means no send.
- Quiet hours means delay.
- Rate limit exceeded means delay.
- Aggressive/legal language means block.

## Workflow 5: Source Sync Failure Recovery

### Happy path

```text
1. Sync fails.
2. sync_runs.status = failed or partial.
3. source_connections.status = needs_attention if user action required.
4. action_audit_log records failure.
5. /app/automation shows visible error.
6. Owner can retry or pause source.
```

### Recovery rules

- Retry transient failures with backoff.
- Do not retry permanent validation failures.
- Do not create duplicate records after retry.
- Every retry must preserve idempotency key/source external id.

## Required handoff contract format

Every future workflow spec must define this:

```text
HANDOFF: [From] -> [To]
PAYLOAD: { field: type }
SUCCESS RESPONSE: { field: type }
FAILURE RESPONSE: { error: string, code: string, retryable: boolean }
TIMEOUT: [duration]
ON FAILURE: [recovery action]
AUDIT EVENT: [event_name]
```

## Immediate missing specs

Before building more automation, write specs for:

```text
WORKFLOW-scheduled-daily-brief.md
WORKFLOW-gmail-readonly-sync.md
WORKFLOW-google-sheets-sync.md
WORKFLOW-approved-send-queue.md
WORKFLOW-source-sync-failure-recovery.md
```
