# Cycle 13 — Production Automation Architecture

Date: 2026-07-09

## Trigger

The user asked how DTC becomes a final production-ready product with full automation, while keeping manual control where necessary.

The answer is not to automate everything.

The answer is to create a safe automation backbone first.

## What this cycle adds

### Migration

Adds:

```text
supabase/migrations/0005_production_automation_architecture.sql
```

Tables:

```text
automation_settings
source_connections
sync_runs
notification_queue
action_audit_log
```

Function:

```text
get_or_create_automation_settings()
```

### Docs

Adds:

```text
docs/PRODUCTION-AUTOMATION-ARCHITECTURE.md
```

## Production automation model

```text
Sources
→ Sync jobs / adapters
→ Normalized records
→ Rule engine
→ Today actions
→ Notification queue
→ Owner approval
→ Send/log outcome
→ Audit + analytics
```

## Safe defaults

```text
customer_message_mode = draft_only
require_approval_for_customer_messages = true
approved_send_enabled = false
autopilot_enabled = false
```

## What stays manual

Manual stays required for:

- approving customer-facing messages
- editing tone
- disputed invoices
- opt-out cases
- unclear imported data
- sensitive business/customer context
- connecting sources
- choosing automation settings

## What can become automatic

DTC can automate:

- source capture
- sync runs
- stuck-work detection
- Today action creation
- owner daily briefs
- draft creation
- audit logging
- internal reminders

## What is still blocked

Still blocked:

- automatic customer WhatsApp sends
- automatic customer payment chasing
- legal/debt collection messaging
- accounting/payment write-back
- source write-back
- storing OAuth tokens in plain JSON
- service-role use inside the normal app runtime

## Next recommended cycle

```text
Cycle 14 — Automation Settings + Audit Visibility
```

Build:

- automation settings UI
- read-only audit feed
- source connection skeleton page
- notification queue preview
- no scheduler yet
- no sender yet

Owner control must exist before any real scheduled automation.
