# Cycle 14 — Automation Settings + Audit Visibility

Date: 2026-07-09

## Goal

Make the Cycle 13 automation foundation visible and controllable before adding schedulers, source integrations or senders.

Owner control comes first.

## What this cycle adds

### `/app/automation`

A new authenticated Automation Control page.

It shows:

- automation settings
- source connection skeletons
- notification queue preview
- sync run history
- action audit log
- explicit blocked-autopilot guardrails

### Settings action

Adds a server action for saving automation settings safely.

Safe defaults remain enforced:

```text
require_approval_for_customer_messages = true
autopilot_enabled = false
approved_send_enabled only works with approved_send mode
```

### Navigation

Adds `Automation` to the authenticated app navigation after `Brief` and before `Settings`.

This preserves the product hierarchy:

```text
Today first
records second
automation later
settings last
```

## What this cycle does not add

This cycle does not add:

- cron jobs
- scheduled sending
- customer WhatsApp automation
- customer email automation
- Gmail/Sheets connection
- OAuth token storage
- service-role use in app runtime
- autopilot

## Migration dependency

This page uses the Cycle 13 migration:

```text
supabase/migrations/0005_production_automation_architecture.sql
```

If the migration is not applied, `/app/automation` shows a safe fallback message instead of breaking the app.

## Test flow

```text
1. Open /app/automation
2. Confirm settings form loads
3. Confirm autopilot warning is visible
4. Save settings
5. Confirm success message
6. Confirm audit log shows automation_settings_updated
7. Confirm queue/sync/source sections do not imply anything is running automatically
```

## Next safe cycle

After this page is stable:

```text
Cycle 15 — Scheduled Owner Daily Brief Queue
```

That cycle should create owner brief queue items only. It should still not send customer messages.
