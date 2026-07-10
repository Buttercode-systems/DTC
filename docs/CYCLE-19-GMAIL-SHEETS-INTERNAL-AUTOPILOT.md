# Cycle 19 — Gmail, Google Sheets and Internal Autopilot

## Purpose

Make the planned Google Sheets and Gmail source connections real while keeping DueToday inside the product guardrail:

```text
source sync → records → Today actions → owner brief → owner approval before customer sends
```

This cycle does **not** enable unapproved customer WhatsApp or email sending.

## What changed

### Database

Added migration:

```text
supabase/migrations/0007_google_sources_internal_autopilot.sql
```

It adds:

- `source_connection_secrets` — service-role-only storage for encrypted Google OAuth tokens.
- `source_import_events` — dedupe/audit evidence for imported Gmail messages and Sheet rows.
- a stricter automation settings constraint that allows internal autopilot while keeping customer approval required.

### Google integrations

Added:

```text
lib/integrations/google.ts
lib/integrations/sync.ts
app/api/integrations/google/start/route.ts
app/api/integrations/google/callback/route.ts
```

Google Sheets can now:

- connect through Google OAuth.
- read a selected spreadsheet range.
- parse rows as quotes or invoices using the existing CSV/paste import parser.
- create customers, quotes or invoices.
- run the Today engine after sync.
- log sync results and import evidence.

Gmail can now:

- connect through Google OAuth.
- read messages matching an owner-defined Gmail query.
- create lead records from matched emails.
- run the Today engine after sync.
- log sync results and import evidence.

### Automation UI

Updated:

```text
app/app/automation/page.tsx
app/app/automation/actions.ts
```

The Automation page now shows:

- Google Sheets as live.
- Gmail as live.
- connection forms.
- Sync now actions.
- internal autopilot toggle.
- source sync status and last errors.

### Cron/autopilot

Updated:

```text
app/api/cron/owner-daily-briefs/route.ts
```

The existing daily cron now also runs internal autopilot source sync for businesses where:

```text
autopilot_enabled = true
```

It syncs active Google Sheets/Gmail connections, runs the engine, then continues to queue the owner daily brief if the brief is enabled and due.

## Required environment variables

Set these before testing Google connections:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://YOUR_DOMAIN/api/integrations/google/callback
INTEGRATION_SECRET_KEY=<long random secret>
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

Existing required Supabase variables still apply:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Google OAuth scopes

Google Sheets:

```text
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/spreadsheets.readonly
```

Gmail:

```text
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/gmail.readonly
```

## Safety guardrails

- Tokens are stored encrypted in `source_connection_secrets`.
- `source_connection_secrets` has RLS enabled and no owner-facing policies.
- Source sync creates records and Today actions only.
- Gmail is read-only.
- Sheets is read-only.
- Internal autopilot does not send WhatsApp or customer email.
- Customer-facing sends still require approval.
- Existing quiet hours / pause settings remain part of the automation settings model.

## What is live after migration + env setup

```text
Manual capture: live
CSV/paste import: live
Google Sheets sync: live
Gmail sync: live
Internal autopilot source sync: live
Owner daily brief queue: live
Customer autopilot sends: blocked
```

## Manual test plan

1. Apply migrations through Supabase:

```text
0005_production_automation_architecture.sql
0006_production_hardening.sql
0007_google_sources_internal_autopilot.sql
```

2. Set the required Vercel env vars.
3. Deploy preview branch.
4. Sign in as a test business owner.
5. Open `/app/automation`.
6. Connect a test Google Sheet.
7. Use a sheet with headers like:

```csv
number,customer,amount,sent_days_ago,phone,description
QT-200,Demo Client,12000,5,0710000000,Demo quote
```

8. Click Sync now.
9. Confirm:

- sync run is logged.
- quote/invoice record is created.
- Today actions update.
- source import event is recorded.

10. Connect Gmail with a narrow query, for example:

```text
newer_than:7d subject:(quote OR invoice OR inquiry)
```

11. Click Sync now.
12. Confirm:

- matched emails become leads.
- Today shows lead-response actions.
- no email is sent.

13. Set customer message mode to `Internal autopilot only` and enable internal autopilot.
14. Trigger the cron endpoint with `CRON_SECRET`.
15. Confirm source sync runs and an owner brief is queued.

## Launch blockers

Do not merge/deploy publicly until:

- Google OAuth consent screen is configured.
- `GOOGLE_REDIRECT_URI` exactly matches the deployed callback URL.
- Supabase migrations are applied.
- AppSec review signs off on token storage + service-role routes.
- Accessibility audit signs off on the Automation page forms.
- Performance smoke confirms source sync does not slow `/app` routes.
- Reality Checker returns a launchable verdict.
