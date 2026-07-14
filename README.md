# DueToday + TAD shared production repository

This repository contains two separate platforms that share infrastructure:

1. **DueToday** — an action and follow-up platform for leads, quotes, invoices and recurring business commitments.
2. **The Admin Department (TAD)** — a six-department back-office operating platform available as TAD SaaS, TAD Managed or Hybrid.

They share Supabase, authentication, deployment infrastructure and selected workflow primitives. They do not share the same product promise, signup path, navigation or default workspace configuration.

## DueToday

**Promise:** Find what is stuck. Know what to do next. Keep the business moving.

DueToday diagnoses stuck work, derives actions due today, records what happened and keeps the next commitment visible.

```text
Business Execution Assessment
→ DueToday workspace
→ leads, quotes and invoices captured or imported
→ Today action queue
→ recorded outcome
→ next commitment remains visible
```

Main DueToday surfaces:

- `/assessment` — Business Execution Assessment
- `/report/[token]` — tokenized Momentum Report
- `/app` — DueToday action queue
- `/app/leads`
- `/app/quotes`
- `/app/invoices`
- `/app/customers`
- `/app/pipeline`
- `/app/import` — quote and invoice intake
- `/app/report`
- `/app/settings`

DueToday is not a generic CRM, accounting replacement, debt-collection bot or autonomous messaging system.

## The Admin Department

**Promise:** One complete back-office operating platform containing six connected admin departments.

Every TAD workspace includes:

- Invoice Admin
- Sales Admin
- Client Admin
- Property Admin
- Practice / Booking Admin
- Member Admin

Operating models:

- **TAD SaaS** — the customer runs all six departments.
- **TAD Managed** — TAD operates some or all departments with the customer.
- **Hybrid** — responsibility is divided department by department.

Main TAD surfaces:

- `/app` — unified TAD Today queue
- `/app/departments`
- `/app/departments/[department]`
- `/app/service` — approvals, progress and reports
- `/app/import` — all-department CSV intake
- `/app/team`
- `/app/account`
- `/portal` — managed-client activation entry
- `/ops` — private TAD multi-client Operations Console

## Product boundary

Each business has an explicit `platform_key`:

- `duetoday`
- `tad`

Generic signup and provisioning default to DueToday. TAD departments are activated only through an explicit TAD SaaS signup or a verified TAD Managed activation.

A passing TAD test does not prove DueToday is healthy. Release verification must cover both products independently and together.

## Stack

- Next.js 14, App Router, TypeScript and Tailwind
- Supabase Postgres, Auth, RLS and narrow RPC functions
- Vercel production deployment
- Playwright browser tests

## Local development

Use `.env.example` as the authoritative list of required and optional environment variables.

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

`npm run verify` runs TypeScript checks, linting, DueToday evidence tests, TAD service tests, the permanent product-boundary regression and a production build.

## Database

Apply files in `supabase/migrations/` in numerical order. Migration `0032_separate_duetoday_and_tad_platforms.sql` introduces the explicit platform boundary.

All operational tables use RLS. Today action completion and its linked-record mutation run inside one authenticated database transaction. TAD managed-service access is granted through explicit operator and business-membership checks.

## Controlled automation boundary

Scheduled briefs, source autopilot and customer delivery remain disabled until credentials, monitoring and end-to-end delivery checks exist. Both products remain manual-first where external communication or human authority matters.

## Production ownership

```text
GitHub:  Buttercode-systems/DTC
Branch:  main
Database: pzvytksdpwnsnixcbrzr
Vercel:  due-today
```

Do not deploy from or document the retired repository or retired Vercel project.
