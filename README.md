# DueToday

Find what is stuck. Know what to do next. Keep your business moving.

DTC is the working product implementation of DueToday Core: a Business Execution OS that diagnoses stuck work and turns it into clear actions due today.

Live: https://duetoday-therealbutters-projects.vercel.app

## Product compass

The center of the product is:

```text
Business Execution Assessment
→ Momentum Report
→ diagnosed stuck work
→ Today action queue
→ daily execution rhythm
```

The money-action promise remains useful, but it is a wedge, not the whole product:

```text
Know what money actions are due today. Finish the list. Go home.
```

DTC must not become a generic CRM, accounting app, debt-collection tool, or WhatsApp automation bot.

## Product hierarchy

```text
Business Execution OS
│
├── Assessment
├── Momentum Report
├── DueToday Core
│   └── Today action engine
├── DueToday modules
│   ├── Leads
│   ├── Collect
│   └── Docs
└── Specialist systems
    ├── SoloBid
    ├── RentEase
    └── RadFlow
```

## Stack

Next.js 14 (App Router, TypeScript, Tailwind) + Supabase (Postgres, RLS, Auth).
No service-role key anywhere in the app runtime: the public assessment funnel and account provisioning run through narrow SECURITY DEFINER functions.

## Structure

- `PRODUCT-CHARTER.md` — product compass and build rules
- `docs/DTC-VS-DUETODAY-CORE.md` — comparison and correction against DueToday-Core
- `docs/PRODUCT-HIERARCHY.md` — hierarchy across Core, modules and specialist systems
- `docs/MODULE-BOUNDARIES.md` — Core vs Leads vs Collect vs Docs boundaries
- `docs/WORKFLOW-REGISTRY.md` — current workflow registry and missing workflow specs
- `docs/CURRENT-SYSTEM-MAP.md` — current route/data/automation/trust-boundary map
- `docs/workflows/` — workflow specs that implementation and QA must follow
- `docs/PRODUCTION-AUTOMATION-ARCHITECTURE.md` — safe automation backbone and guardrails
- `docs/CYCLE-13-PRODUCTION-AUTOMATION.md` — Cycle 13 summary and next recommended cycle
- `docs/AGENT-OPERATING-SYSTEM.md` — governed agent workflow for future automation work
- `docs/DTC-AUTOMATION-WORKFLOW-MAPS.md` — automation workflow registry and planned paths
- `docs/AGENT-CONTRACTS.md` — input/output contracts for specialist agents
- `docs/AUTOMATION-FAILURE-MODES.md` — required failure-mode handling for automation
- `docs/QA-GATES.md` — evidence gates before readiness claims
- `lib/framework.ts` — Business Execution Framework v1.0 (7 jobs × 5 dimensions, 35 questions)
- `lib/scoring.ts` — scoring, momentum, findings, recommendations, starter actions
- `lib/engine.ts` — the daily action engine
- `supabase/migrations/` — schema + RPC functions
- `app/` — landing, assessment, report, auth, and the `/app` product

## Current product surfaces

- `/assessment` — Business Execution Assessment
- `/report/[token]` — Momentum Report
- `/app` — Today action queue
- `/app/leads` — DueToday Leads / source feeder
- `/app/quotes` — DueToday Collect / source feeder
- `/app/invoices` — DueToday Collect / source feeder
- `/app/import` — capture automation that feeds Today
- `/app/brief` — owner daily rhythm foundation
- `/app/automation` — automation settings, queue preview, source skeletons and audit visibility
- `/app/admin` — soft-launch learning dashboard

## Automation guardrail

Automation must happen in this order:

```text
capture
→ detection
→ action creation
→ draft/brief preparation
→ owner approval
→ send/log outcome
→ autopilot only after trust
```

Safe defaults:

```text
customer_message_mode = draft_only
require_approval_for_customer_messages = true
approved_send_enabled = false
autopilot_enabled = false
```

## Agent-governed build rule

Automation work must now follow the agent operating system:

```text
Agents Orchestrator
→ Workflow Architect
→ Multi-Agent Systems Architect
→ Backend Architect
→ Security Architect
→ Database Optimizer
→ UX/UI when user-facing
→ Developer
→ Test Automation Engineer
→ Reality Checker
```

No new automation ships unless the workflow is mapped, risks are handled, QA evidence exists, and Reality Checker does not block it.

## Workflow registry rule

Before adding or changing automation, update:

```text
docs/WORKFLOW-REGISTRY.md
docs/CURRENT-SYSTEM-MAP.md
relevant docs/workflows/WORKFLOW-*.md
```

A workflow that exists in code but not in the registry is treated as a product risk.

## Build rules

Before adding a feature, ask:

```text
Does this strengthen assessment → diagnosis → Today action → daily rhythm?
```

If not, pause.

Navigation priority:

```text
Today first
Assessment before recommendation
Actions before records
Records before automation
Automation before autopilot
```

## Local development

1. `npm install`
2. Copy `.env.example` to `.env.local` and set the Supabase URL + anon key. These values are public by design; RLS and narrow SECURITY DEFINER RPCs are the security boundary.
3. `npm run dev`

## Verification

Run the full local gate before deploying or merging product changes:

```bash
npm run verify
```

This runs:

```bash
npm run typecheck
npm run lint
npm run build
```

## Deploying schema changes

Apply files in `supabase/migrations/` in order against your Supabase project (SQL editor or CLI).

## Production checklist

- Supabase Dashboard → Authentication → URL Configuration → set Site URL to the production domain.
- Supabase Dashboard → Authentication → URL Configuration → add the production redirect URL.
- Run `npm run verify` before production deploys.
- Review the assessment RPC functions before sending real traffic.
- Apply and review automation migrations before enabling scheduled sends.
