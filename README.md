# DueToday

Find what is stuck. Know what to do next. Keep the business moving.

DueToday is the operational platform used by The Admin Department to run managed client workflows. It diagnoses stuck work, derives actions due today, records what happened and keeps the next commitment visible.

**Production:** https://due-today-six.vercel.app  
**Repository:** `Buttercode-systems/DTC` (`main`)  
**Supabase:** `pzvytksdpwnsnixcbrzr`

## Product and service flow

```text
Business Execution Assessment / TAD Admin Audit
→ managed client workspace
→ starting records organised
→ Today action queue
→ recorded outcomes and next dates
→ human approvals
→ weekly service report
→ workflow improvement
```

DueToday is not a generic CRM, accounting replacement, debt-collection bot or autonomous messaging system. It is the shared action and control engine underneath a managed admin service.

## Stack

- Next.js 14, App Router, TypeScript and Tailwind
- Supabase Postgres, Auth, RLS and narrow RPC functions
- Vercel production deployment
- Playwright smoke tests

## Main product surfaces

- `/assessment` — Business Execution Assessment
- `/report/[token]` — tokenized Momentum Report
- `/app` — active client Today action queue
- `/app/leads`, `/app/quotes`, `/app/invoices` — source records
- `/app/import` — CSV capture
- `/app/report` — claimed assessment report
- `/ops` — private TAD multi-client Operations Console
- `/app/brief` — disabled pilot boundary page
- `/app/automation` — disabled pilot boundary page
- `/app/admin` — soft-launch product dashboard

## Managed service foundation

The platform now supports:

- secure TAD operator roles;
- multiple managed client businesses per operator;
- active-workspace switching;
- service engagements by department;
- approval queues;
- action outcomes and dated follow-ups;
- weekly service reports;
- owner and member access policies.

The Admin Department remains the customer-facing service company. DueToday is the shared operational system used by operators and clients.

## Environment setup

Copy `.env.example` to `.env.local`.

Core runtime requires:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Future scheduled automation and server-side source sync require:

```text
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
INTEGRATION_SECRET_KEY
```

Future Google connections require:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
```

Future email delivery requires:

```text
RESEND_API_KEY
RESEND_FROM or DAILY_BRIEF_FROM
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, OAuth secrets, Resend keys or integration secrets through `NEXT_PUBLIC_` variables.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Verification

```bash
npm run verify
npm run test:smoke
```

`npm run verify` runs TypeScript checks, ESLint, the evidence regression suite and a production build. GitHub Actions runs release gates on pull requests and pushes to `main`.

## Database

Apply files in `supabase/migrations/` in numerical order. Production includes migrations `0001` through `0012` after this service-delivery release is promoted.

All operational tables use RLS. Assessment/report access is limited to narrow RPC functions. Today action completion and its linked-record mutation run inside one authenticated database transaction. Managed service access is granted through explicit operator and business-membership checks.

## Controlled pilot boundary

Scheduled briefs, source autopilot and customer delivery remain disabled until credentials, monitoring and end-to-end delivery checks exist. The service is manual-first: records feed Today actions, an authorised person performs the external work, and the real outcome is recorded before another action is scheduled.

## Production ownership

The clean source of truth is only:

```text
GitHub:  Buttercode-systems/DTC
Branch:  main
Database: pzvytksdpwnsnixcbrzr
Vercel:  due-today
```

Do not deploy from or document the retired `TheRealButter/DTC` repository or the old `duetoday` Vercel project.
