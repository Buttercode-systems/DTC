# Cycle 16 — Workflow Registry + Current System Map

Date: 2026-07-09

## Trigger

After Cycle 15 introduced the agent-governed automation blueprint, DTC needed a current-state workflow registry before building more automation.

The key rule is:

```text
Do not automate workflows that are not mapped.
```

## What this cycle adds

```text
docs/WORKFLOW-REGISTRY.md
docs/CURRENT-SYSTEM-MAP.md
docs/workflows/WORKFLOW-assessment-to-report.md
docs/workflows/WORKFLOW-signup-provisioning.md
docs/workflows/WORKFLOW-today-action-engine.md
docs/workflows/WORKFLOW-import-to-today.md
docs/workflows/WORKFLOW-daily-brief-preview.md
docs/workflows/WORKFLOW-automation-settings.md
```

## Current system map

DTC currently flows as:

```text
Landing
→ Business Execution Assessment
→ Momentum Report
→ Signup/Login
→ Business provisioning
→ Today action queue
→ Records/imports feed actions
→ Daily brief preview
→ Automation visibility/control
→ Soft-launch feedback/admin learning
```

## Workflows now approved

```text
Assessment to Report
Signup and Business Provisioning
Today Action Engine
Import to Today
Daily Brief Preview and Test Send
Automation Settings and Audit Visibility
```

## Workflows identified but still missing specs

```text
Landing to Assessment
Lead Management
Customer Management
Quote Management
Invoice Management
Feedback and Admin Learning
Scheduled Owner Daily Brief Queue
Gmail Read-Only Sync
Google Sheets Read-Only Sync
Approved-Send Queue
```

## Key findings

### 1. The core product flow is coherent

The current implementation already follows the corrected product compass:

```text
Assessment → Report → Signup → Today → records/imports feed actions
```

### 2. The action engine is the real product core

The engine already handles:

```text
lead_response
quote_followup
quote_expired
invoice_chase
supplier_approval
promise_check
recurring_invoice
```

and uses deterministic keys to avoid duplicate action creation.

### 3. Import is useful but not yet source-sync ready

Import currently works as manual paste/CSV capture with preview and automatic engine run.

Before Gmail/Sheets reuse the import pattern, DTC needs:

```text
sync_runs logging
source external ids
stronger duplicate constraints
partial failure handling
```

### 4. Daily brief is currently preview/test-send, not scheduled automation

This is good. The scheduled version must be a separate workflow and must write to `notification_queue` first.

### 5. Automation settings are visibility/control only

`/app/automation` is correctly blocked from becoming autopilot. It shows controls, migration fallback, skeleton sources, queue preview and audit log, but it does not run jobs or send customer messages.

## Blockers before the next automation build

```text
Cycle 13 migration must be applied live if not already done
Playwright smoke tests do not exist yet
Lead/quote/invoice CRUD workflows need specs
Scheduled daily brief queue needs a dedicated workflow spec
No opt-out/dispute model exists yet
No Gmail/Sheets connector spec exists yet
```

## Next recommended cycle

```text
Cycle 17 — Playwright Production Smoke Tests
```

Why:

The workflow map is now in place. Before adding schedulers or source adapters, DTC needs evidence gates for the live product journeys.

Recommended Cycle 17 scope:

```text
Playwright setup
smoke test for landing/assessment/report
smoke test for login redirect/app protection
smoke test for import preview route
smoke test for automation migration fallback route
CI/test docs
no product feature changes
```
