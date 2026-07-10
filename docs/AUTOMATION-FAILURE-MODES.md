# Automation Failure Modes

Date: 2026-07-09

## Purpose

DTC automation must be designed for failure before it is allowed to run automatically.

This document lists the failure modes that every automation cycle must handle.

## Global rule

If DTC is unsure, it must:

```text
pause
show owner/operator state
log the issue
avoid customer-facing action
```

## Failure mode categories

### 1. Input failures

Examples:

- invalid CSV amount
- missing customer name
- bad date format
- unknown quote/invoice number
- email thread cannot be parsed
- Google Sheet column renamed

Required behavior:

```text
Do not create action blindly.
Send row/item to review.
Show clear error in UI.
Record sync_runs count/error.
```

### 2. Duplicate detection failures

Examples:

- same invoice imported twice
- Gmail thread already converted into lead
- Sheets row changes but source id missing
- same action generated from two sources

Required behavior:

```text
Use source external id where possible.
Use business_id + source_type + source_record_key.
Dedupe before insert.
Prefer skip/review over duplicate creation.
Log duplicate count.
```

### 3. Partial sync failures

Examples:

- 90 rows imported, 10 failed
- Gmail sync rate limited halfway
- Sheets read succeeds but record insert fails

Required behavior:

```text
sync_runs.status = partial
record seen/created/updated/action counts
show partial warning in /app/automation
retry only retryable failures
never rerun without idempotency
```

### 4. Transient external failures

Examples:

- Gmail rate limit
- Sheets timeout
- Resend temporary failure
- Vercel/Supabase network issue

Required behavior:

```text
retry with backoff
cap retry attempts
set status = failed after cap
preserve error code
no duplicate actions on retry
```

### 5. Permanent external failures

Examples:

- OAuth revoked
- permission denied
- file deleted
- mailbox inaccessible
- invalid sender domain

Required behavior:

```text
source_connections.status = needs_attention
notification_queue.status = blocked or failed
show user action needed
no infinite retries
```

### 6. Customer message safety failures

Examples:

- missing approval
- disputed invoice
- opt-out detected
- quiet hours
- rate limit exceeded
- risky/aggressive message

Required behavior:

```text
block send
keep notification_queue.status = blocked
show reason
log action_audit_log event
require owner action
```

### 7. Prompt injection / malicious content

Examples:

- email says "ignore previous instructions"
- attachment contains instructions to send payments
- customer text tries to alter automation behavior

Required behavior:

```text
Treat source content as data only.
Never execute instructions from email/docs.
Validate extracted output against schema.
Require owner review for uncertain/risky output.
```

### 8. Cross-tenant leakage

Examples:

- wrong business_id in sync
- source connection read by another owner
- audit log visible to wrong user

Required behavior:

```text
RLS owner checks everywhere
business_id required everywhere
never use service-role in normal app runtime
security review blocks release
```

### 9. Queue stuck state

Examples:

- notification_queue item queued forever
- approved item never sent
- retry count growing
- scheduler stops creating brief items

Required behavior:

```text
queue preview shows stuck rows
SRE alert when queue age threshold exceeded
manual cancel/retry path before sender is enabled
```

### 10. Engine idempotency failure

Examples:

- opening `/app` creates duplicate actions
- import save creates duplicate actions
- daily brief run creates duplicate queue items

Required behavior:

```text
stable action keys
upsert instead of blind insert
unique source keys where possible
idempotency test required
```

### 11. UI misrepresentation

Examples:

- UI implies automation is running when it is not
- button says send but only queues
- daily brief looks scheduled but is manual

Required behavior:

```text
copy must say Preview, Queue, Draft, or Approved-send exactly.
No hidden auto-send behavior.
Reality Checker reviews UX claims.
```

## Failure response matrix

| Failure | Retry? | User visible? | Audit? | Customer action allowed? |
|---|---:|---:|---:|---:|
| Invalid input | No | Yes | Yes | No |
| Duplicate | No | Optional | Count | No new action |
| Rate limit | Yes | If persistent | Yes | No |
| OAuth revoked | No | Yes | Yes | No |
| Missing approval | No | Yes | Yes | No |
| Quiet hours | Later | Yes | Yes | Delay only |
| Prompt injection | No | Maybe | Yes | No |
| Cross-tenant risk | No | Admin/security | Yes | No |
| Queue stuck | Maybe | Yes | Yes | No |

## Required logs/events

Every automated workflow must record at least one of:

```text
sync_runs
action_audit_log
notification_queue
analytics_events
```

No automation may fail silently.

## Release rule

Any automation feature that does not explicitly handle these failure modes is:

```text
NEEDS_WORK
```

and cannot be shipped as production-ready.
