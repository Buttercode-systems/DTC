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

The platform supports:

- secure TAD operator roles;
- multiple managed client businesses per operator;
- active-workspace switching;
- service engagements by department;
- approval queues;
- action outcomes and dated follow-ups;
- weekly service reports;
- role-aware owner, manager, member and viewer access.

The Admin Department remains the customer-facing service company. DueToday is the shared operational system used by operators and clients.

## Local development

Use `.env.example` as the authoritative list of required and optional environment variables. Never expose administrator credentials, OAuth secrets, email-delivery keys or integration secrets through browser-visible variables.

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

Apply files in `supabase/migrations/` in numerical order. The repository includes migrations `0001` through `0014`; the service foundation was applied to production in smaller audited stages matching migrations `0012` through `0014`.

All operational tables use RLS. Assessment/report access is limited to narrow RPC functions. Today action completion and its linked-record mutation run inside one authenticated database transaction. Managed-service access is granted through explicit operator and business-membership checks.

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

Do not deploy from or document the retired repository or the retired Vercel project.
