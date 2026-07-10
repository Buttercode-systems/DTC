# Current System Map

Date: 2026-07-09

## Product position

DTC is currently a Business Execution OS pilot with these live layers:

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

## Runtime architecture

```text
Next.js App Router
├── Public routes
│   ├── /
│   ├── /assessment
│   ├── /report/[token]
│   ├── /privacy
│   ├── /terms
│   └── /early-access
├── Auth routes
│   ├── /signup
│   ├── /login
│   └── /auth/signin
├── Authenticated app
│   ├── /app
│   ├── /app/pipeline
│   ├── /app/leads
│   ├── /app/customers
│   ├── /app/quotes
│   ├── /app/invoices
│   ├── /app/import
│   ├── /app/brief
│   ├── /app/automation
│   ├── /app/settings
│   └── /app/admin
└── API routes
    └── /api/assessment
```

## Data architecture

Core tables already used by product flows:

```text
businesses
assessments
customers
leads
quotes
invoices
payment_promises
actions
analytics_events
soft_launch_feedback
soft_launch_admins
```

Automation architecture tables introduced by Cycle 13:

```text
automation_settings
source_connections
sync_runs
notification_queue
action_audit_log
```

Important current caveat:

```text
Cycle 13 migration must be applied live before the Cycle 14 automation page fully works.
The page has a safe migration-missing fallback.
```

## Public funnel map

```text
/ page
→ /assessment
→ POST /api/assessment
→ submit_assessment RPC
→ /report/[token]
→ /signup?assessment=token
→ Supabase auth signup
→ provision_my_business RPC
→ /app
```

## Authenticated app map

```text
/app layout calls requireBusiness()
→ requireBusiness checks Supabase auth user
→ if no user, redirect /login
→ if no business, provision from user metadata
→ if business exists, render app surface
```

## Action engine map

Triggers that currently run or depend on the engine:

```text
/app page load
/app/import save
daily brief generation
record changes that refresh the app after create/update
```

Engine inputs:

```text
new leads
sent quotes
sent customer invoices
sent supplier invoices
payment promises due today
monthly recurring invoice templates
business settings
```

Engine outputs:

```text
lead_response
quote_followup
quote_expired
invoice_chase
supplier_approval
promise_check
recurring_invoice
```

Engine rules:

```text
read record state
derive due actions
retire stale open actions
wake lapsed snoozes
upsert deterministic action keys
respect done/dismissed/snoozed keys
```

## Automation map

Current automation level:

```text
capture: manual + paste/CSV
parse: automatic for import preview
record creation: manual save
engine detection: automatic
brief generation: manual preview/test
queue processing: not active
source connectors: skeleton only
approved-send: not active
autopilot: blocked
```

## External services

```text
Supabase Auth
Supabase Postgres/RLS/RPC
Vercel deployment
Resend daily brief test email when configured
GitHub source control
```

## Trust boundaries

| Boundary | From | To | Current controls |
|---|---|---|---|
| Public visitor | Browser | `/api/assessment` | validation + anon Supabase + RPC |
| Anonymous report reader | Browser | `get_assessment` RPC | private token |
| User auth | Browser | Supabase Auth | email/password/session cookies |
| Authenticated user | App | business data | owner-scoped queries + RLS intended |
| App | Supabase RPC | provisioning/assessment | narrow SECURITY DEFINER functions |
| App | Resend | daily brief test email | env-gated, owner email only |
| Future source content | Gmail/Sheets | DTC parser | not implemented; must be treated as hostile data |
| Future customer messaging | DTC | customer email/WhatsApp | blocked until approval/opt-out/dispute gates exist |

## Observability currently present

```text
analytics_events for product events
soft_launch_feedback for tester feedback
soft_launch_admin dashboard for aggregate visibility
action_audit_log planned/used by automation settings once migration applied
Vercel build/runtime logs available externally
```

## Known current gaps

```text
No Playwright smoke suite yet
No workflow specs for lead/quote/invoice CRUD yet
No live scheduler yet
No source sync adapters yet
No active notification queue processor yet
No opt-out/dispute model yet
No sender retry/dead-letter behavior yet
Cycle 13 DB migration still needs live apply if not already manually applied
```

## System design verdict

Current state:

```text
Soft-launch product with strong manual/owner-controlled automation foundation.
```

Not yet:

```text
fully automated production system
Gmail/Sheets-connected automation system
approved-send system
autopilot system
```

The next engineering build after this map should be test infrastructure, not more automation surface area.
