# DueToday

Find what is stuck. Know what to do next. Keep your business moving.

DTC is the working implementation of DueToday Core: a Business Execution OS that diagnoses stuck work and turns it into clear actions due today.

**Production:** https://due-today-six.vercel.app  
**Repository:** `Buttercode-systems/DTC` (`main`)  
**Supabase:** `pzvytksdpwnsnixcbrzr`

## Product flow

```text
Business Execution Assessment
→ Momentum Report
→ diagnosed stuck work
→ Today action queue
→ daily execution rhythm
```

The money-action promise remains an entry point, not the whole product. DTC must not become a generic CRM, accounting app, debt-collection tool, or autonomous messaging bot.

## Stack

- Next.js 14, App Router, TypeScript and Tailwind
- Supabase Postgres, Auth, RLS and narrow RPC functions
- Vercel production deployment
- Playwright smoke tests

## Main product surfaces

- `/assessment` — Business Execution Assessment
- `/report/[token]` — tokenized Momentum Report
- `/app` — Today action queue
- `/app/leads`, `/app/quotes`, `/app/invoices` — source records
- `/app/import` — CSV capture
- `/app/brief` — disabled pilot boundary page
- `/app/automation` — disabled pilot boundary page
- `/app/admin` — soft-launch dashboard

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

Never expose `SUPABASE_SERVICE_ROLE_KEY`, OAuth secrets, Resend keys, or integration secrets through `NEXT_PUBLIC_` variables.

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

`npm run verify` runs TypeScript checks, ESLint and a production build. GitHub Actions runs the same gate on every pull request and every push to `main`.

## Database

Apply files in `supabase/migrations/` in numerical order. Production currently includes migrations `0001` through `0010`.

All operational tables use RLS. Assessment/report access is limited to narrow RPC functions. Today action completion and its linked-record mutation run inside one authenticated database transaction.

## Controlled pilot boundary

Scheduled briefs, source autopilot and customer delivery are intentionally disabled in production until credentials, monitoring and end-to-end delivery checks exist. The current pilot is manual-first: records feed Today actions, and the owner performs and records every external action.

## Production ownership

The clean source of truth is only:

```text
GitHub:  Buttercode-systems/DTC
Branch:  main
Database: pzvytksdpwnsnixcbrzr
Vercel:  due-today
```

Git webhook verification trigger: 2026-07-11 11:43 SAST.

Do not deploy from or document the retired `TheRealButter/DTC` repository or the old `duetoday` Vercel project.
