# Workflow Registry

Date: 2026-07-09

## Purpose

This is the authoritative workflow registry for DTC.

The rule from Cycle 15 now applies:

```text
Every workflow that exists in code must be visible here.
Every planned automation must have a workflow spec before implementation.
```

## Registry status labels

```text
Approved     = spec reflects current code and can be used for QA
Review       = implemented but needs deeper failure-mode coverage
Draft        = planned or partially specified
Missing      = exists in code but no dedicated workflow spec yet
Deprecated  = replaced, kept for history
Blocked      = should not be built until prerequisite exists
```

## Workflow registry

| Workflow | Spec | Status | Trigger | Primary actor | Current automation level | Evidence |
|---|---|---:|---|---|---|---|
| Landing to assessment | Missing | Review | User clicks CTA | User | Manual navigation | `app/page.tsx`, `/assessment` |
| Assessment to report | `docs/workflows/WORKFLOW-assessment-to-report.md` | Approved | `POST /api/assessment` | User + API | Scoring/report save automatic | `app/api/assessment/route.ts`, `app/report/[token]/page.tsx` |
| Signup and business provisioning | `docs/workflows/WORKFLOW-signup-provisioning.md` | Approved | Signup or first authenticated app visit | User + Auth + RPC | Business creation automatic | `app/signup/actions.ts`, `lib/db.ts` |
| Today action engine | `docs/workflows/WORKFLOW-today-action-engine.md` | Approved | `/app`, import, brief, record changes | System | Automatic detection + idempotent action creation | `lib/engine.ts` |
| Lead creation/status | Missing | Review | `/app/leads` form/action | User | Manual capture + event tracking | `app/app/actions.ts` |
| Customer creation | Missing | Review | `/app/customers` form | User | Manual capture + event tracking | `app/app/actions.ts` |
| Quote creation/status | Missing | Review | `/app/quotes` form/action | User | Manual capture + event tracking | `app/app/actions.ts` |
| Invoice creation/payment/promise | Missing | Review | `/app/invoices` form/action | User | Manual capture + engine triggers | `app/app/actions.ts` |
| Import to Today | `docs/workflows/WORKFLOW-import-to-today.md` | Approved | `/app/import` save | User + System | Manual paste + automatic engine run | `components/ImportWorkbench.tsx`, `app/app/actions.ts` |
| Daily brief preview/test send | `docs/workflows/WORKFLOW-daily-brief-preview.md` | Approved | `/app/brief` open or test-send | User + System | Manual preview/test; no scheduler | `lib/daily-brief.ts`, `app/app/actions.ts` |
| Automation settings + audit visibility | `docs/workflows/WORKFLOW-automation-settings.md` | Approved | `/app/automation` save | User | Manual controls; no sender/autopilot | `app/app/automation/page.tsx`, `app/app/automation/actions.ts` |
| Feedback capture | Missing | Review | Feedback form submit | User | Manual feedback + event tracking | `app/app/actions.ts`, `components/FeedbackForm.tsx` |
| Admin soft-launch dashboard | Missing | Review | `/app/admin` | Admin user | Read-only aggregate dashboard | `app/app/admin/page.tsx` |
| Notification queue processing | Missing | Blocked | Future scheduler/sender | System | Not active | Requires sender spec |
| Source connection setup | Missing | Draft | Future `/app/automation` connector flow | User | Skeleton only | Requires connector spec |
| Scheduled owner daily brief queue | Missing | Draft | Future cron | System | Not active | Requires workflow spec before build |
| Gmail read-only intelligence sync | Missing | Blocked | Future source sync | System | Not active | Requires security + email intelligence specs |
| Google Sheets read-only sync | Missing | Blocked | Future source sync | System | Not active | Requires source mapping spec |
| Approved-send queue | Missing | Blocked | Future owner approval | User + System | Not active | Requires sender gate + opt-out/dispute model |

## Component map

| Component | File(s) | Workflows it participates in |
|---|---|---|
| Assessment API | `app/api/assessment/route.ts` | Assessment to report |
| Report page | `app/report/[token]/page.tsx` | Assessment to report, report to signup |
| Signup actions | `app/signup/actions.ts` | Signup, login, immediate provisioning |
| Business requirement helper | `lib/db.ts` | Authenticated app access, first-visit provisioning |
| App server actions | `app/app/actions.ts` | Action lifecycle, lead/customer/quote/invoice creation, import, daily brief test, feedback, settings |
| Action engine | `lib/engine.ts` | Today action generation, stale action reconciliation, idempotent action creation |
| Import workbench | `components/ImportWorkbench.tsx` | Paste/CSV preview before saving |
| Daily brief library | `lib/daily-brief.ts` | Brief generation and test email send |
| Automation page | `app/app/automation/page.tsx` | Automation settings, queue preview, sync run preview, audit visibility |
| Automation actions | `app/app/automation/actions.ts` | Save automation settings and write audit event |
| Supabase migrations | `supabase/migrations/*` | All database-backed workflows |

## User journey map

| User journey | Underlying workflows | Current state |
|---|---|---|
| Visitor learns what DTC does | Landing to assessment | Implemented, needs route spec |
| Visitor gets Momentum Report | Assessment to report | Approved |
| Visitor turns report into app account | Signup and provisioning | Approved |
| Owner opens app and sees Today | Business provisioning + action engine | Approved |
| Owner adds business records | Lead/customer/quote/invoice creation | Implemented, specs missing |
| Owner imports quote/invoice spreadsheet | Import to Today | Approved |
| Owner checks morning work | Daily brief preview | Approved |
| Owner controls automation | Automation settings | Approved |
| Founder learns from testers | Feedback + admin dashboard | Implemented, specs missing |

## State map

| Entity | States observed | Entered by | Exited by | Notes |
|---|---|---|---|---|
| Assessment | unclaimed, claimed | `submit_assessment`, `provision_my_business` | signup/provisioning | Token is private report link |
| Business | provisioned | signup or first authenticated app visit | not yet deleted | Owner-scoped through RLS/app queries |
| Lead | new, responded, quoted, won, lost | manual create/import future | status update/action complete | New leads create Today actions |
| Quote | sent, accepted, declined, expired | manual create/import | status update/engine expiry | Follow-up actions generated while sent |
| Invoice | sent, paid, approved | manual create/import/recurring issue | paid/approval/action complete | Customer and supplier invoices use different actions |
| Payment promise | pending, kept | record promise | invoice paid/future check | Promise due date creates action |
| Action | open, done, snoozed, dismissed | engine/manual future | action lifecycle | Engine uses deterministic keys |
| Automation settings | default/saved | RPC or settings save | settings save | No autopilot; approval required |
| Notification queue item | queued, ready, blocked, sent, failed, cancelled | future scheduler/sender | future processor | Architecture only; no active sender |
| Source connection | draft, active, paused, needs_attention, disabled | future connector | future connector/admin | Skeleton only |

## Missing workflow specs to create next

```text
WORKFLOW-landing-to-assessment.md
WORKFLOW-lead-management.md
WORKFLOW-quote-management.md
WORKFLOW-invoice-management.md
WORKFLOW-feedback-and-admin-learning.md
WORKFLOW-scheduled-owner-daily-brief-queue.md
WORKFLOW-gmail-readonly-sync.md
WORKFLOW-google-sheets-readonly-sync.md
WORKFLOW-approved-send-queue.md
```

## Current blockers before more automation

1. Cycle 13 migration must be applied live before `/app/automation` can fully save/read settings.
2. No Playwright production smoke suite exists yet.
3. No scheduler route exists yet.
4. No source adapter contract exists yet.
5. No opt-out/dispute model exists yet, so approved-send remains blocked.

## Registry maintenance rule

Every PR after this must update this file when it:

- adds a route
- adds a server action
- adds a database table/function
- changes action engine behavior
- adds automation behavior
- changes source/sender/queue behavior
