# WORKFLOW — Automation Settings and Audit Visibility

Date: 2026-07-09
Status: Approved

## Purpose

Give the owner visibility and control over automation settings before scheduled jobs, source adapters or senders exist.

This workflow is control/visibility only.

## Code evidence

```text
app/app/automation/page.tsx
app/app/automation/actions.ts
supabase/migrations/0005_production_automation_architecture.sql
```

## Trigger

```text
User opens /app/automation
or
User saves automation settings form
```

## Primary actor

```text
Business owner
```

## Happy path — read page

```text
1. User opens /app/automation.
2. Page calls requireBusiness() to enforce authentication and business context.
3. Page calls get_or_create_automation_settings RPC.
4. If settings load, page reads source_connections, sync_runs, notification_queue and action_audit_log for the business.
5. Page renders metric cards.
6. Page renders owner controls.
7. Page renders source skeletons.
8. Page renders queue preview, sync runs and audit log.
9. Page displays explicit no-autopilot warning.
```

## Happy path — save settings

```text
1. User edits form.
2. updateAutomationSettings server action loads business context.
3. Server sanitizes daily brief settings, timezone, channel, customer mode, quiet hours, max messages and pause_until.
4. Server upserts automation_settings.
5. Server forces autopilot_enabled = false.
6. Server forces require_approval_for_customer_messages = true.
7. approved_send_enabled is saved only when customer_message_mode = approved_send.
8. Server inserts action_audit_log event automation_settings_updated.
9. Server tracks automation_settings_updated analytics event.
10. Server revalidates /app/automation.
11. User redirects to success or error query state.
```

## Migration-missing path

```text
1. get_or_create_automation_settings RPC fails.
2. page sets migrationMissing = true.
3. source/sync/queue/audit queries are skipped.
4. page shows migration warning.
5. settings controls are disabled.
6. no automation is enabled.
```

## Input validation failures

| Failure | Current behavior | Future improvement |
|---|---|---|
| Invalid time | cleanTime fallback 07:30 | preserve per-field fallback later |
| Invalid channel | allow-list fallback email | keep |
| Invalid customer mode | allow-list fallback manual_only/draft value | keep |
| Invalid max/day | clamp 0–50 | keep |
| Invalid pause date | Date conversion can produce invalid ISO risk | harden before production scheduler |

## Timeout/transient failures

| Failure | Current behavior | Future behavior |
|---|---|---|
| RPC/table missing | migration fallback | keep |
| Upsert timeout | redirect error=settings | add audit/error display later |
| Audit insert fails after settings save | currently not separately handled | future partial warning |
| Analytics fails | should not block | verify in tests |

## Permanent failures

| Failure | Current behavior | Future behavior |
|---|---|---|
| Migration not applied | safe fallback | apply migration before full use |
| RLS blocks owner row | save error | RLS test required |
| Missing action_audit_log | save may partly fail | migration gate required |

## Partial failures

```text
Settings upsert can succeed while audit insert fails.
Current action does not surface that partial state.
Future improvement: write settings through an RPC that handles settings + audit atomically.
```

## Concurrent conflicts

```text
Two tabs can save settings concurrently.
Last write wins.
Future improvement: updated_at/version conflict warning if needed.
```

## Observable states

Owner sees:

```text
automation controls
migration warning if DB not ready
success/error messages
audit log entries
source skeletons
queue preview
sync run preview
no-autopilot warning
```

Database sees:

```text
automation_settings row
action_audit_log row
analytics_events row
```

Operator sees:

```text
analytics event automation_settings_updated
future admin support view should include automation health
```

## Handoff contract

```text
HANDOFF: Automation page -> get_or_create_automation_settings RPC
PAYLOAD: auth.uid() implicit
SUCCESS RESPONSE: automation_settings row
FAILURE RESPONSE: error object, page sets migrationMissing
TIMEOUT: platform default
ON FAILURE: show safe migration warning
AUDIT EVENT: none
```

```text
HANDOFF: Automation form -> updateAutomationSettings action
PAYLOAD: form data
SUCCESS RESPONSE: redirect /app/automation?saved=settings
FAILURE RESPONSE: redirect /app/automation?error=settings
TIMEOUT: platform default
ON FAILURE: no automation enabled
AUDIT EVENT: automation_settings_updated on success
```

## Safety invariants

```text
customer_message_mode defaults draft_only
require_approval_for_customer_messages always true
autopilot_enabled always false
approved_send_enabled only if approved_send mode
no sender exists
no scheduler exists
no source connector exists
```

## QA requirements

```text
- Page shows safe fallback when migration missing.
- Page loads settings when migration applied.
- Save settings writes automation_settings row.
- Save settings creates action_audit_log row.
- Saving settings never sets autopilot_enabled true.
- Customer approval remains required.
- No customer message is sent.
```

## Status

```text
Approved for current control/visibility implementation.
Needs live migration apply and save-flow test.
```
