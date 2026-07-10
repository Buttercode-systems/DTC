# DTC vs DueToday-Core

Date: 2026-07-09

## Why this document exists

After Cycle 10 and Cycle 11, DTC gained real product weight: soft-launch readiness, feedback, analytics, import, daily brief and message drafts.

That created a risk: the working app started drifting into a money-first mini CRM.

This document re-aligns DTC with DueToday-Core.

## DueToday-Core

DueToday-Core is the source-of-truth / strategy repo.

Its role:

```text
Define the Business Execution Framework, Momentum Map, assessment model,
decision engine, action contract and integration guardrails.
```

DueToday-Core&apos;s key strategic statement:

```text
DueToday is the execution layer that turns business inertia into daily action.
```

DueToday-Core&apos;s customer promise:

```text
Find what is stuck. Know what to do next. Keep your business moving.
```

DueToday-Core&apos;s architecture:

```text
Business Execution Assessment / source app records
→ Momentum Map / app-local DueToday adapter
→ normalized DueTodayAction[]
→ DueToday daily action queue
→ source app deep-work surface
```

## DTC

DTC is the working product repo.

Its role:

```text
Build the live user experience: assessment, report, signup, Today app,
records, soft-launch feedback, basic automation and daily rhythm.
```

DTC is the product vehicle for validating the framework with real users.

It should remain faithful to DueToday-Core, but it does not need to copy the Vite lab app or all admin patterns exactly.

## Main difference

| Area | DueToday-Core | DTC |
| --- | --- | --- |
| Role | Strategy/source-of-truth | Live product implementation |
| Framework | Defines it | Uses it in the user journey |
| Assessment | Audit/funnel proof | Front door to product |
| Report | Momentum Map + recommendations | User-facing execution report |
| Today | Action contract / queue concept | Real authenticated daily action app |
| Records | Source-app/adapters | Local pilot records and imports |
| Admin | Install lead review | Soft-launch usage/feedback dashboard |
| Automation | Guardrails | Safe capture/detect/draft foundation |

## What DTC should borrow from Core

1. Diagnose before prescribing.
2. Recommend capabilities before products.
3. Every recommendation must become a concrete action.
4. Today pages are daily action queues.
5. Entity pages are deep-work surfaces.
6. Reports remain analysis/history.
7. Privacy and app-specific rules beat convenience.
8. Automations should be read-only or owner-approved until explicitly designed otherwise.

## Where DTC drifted

DTC started leaning too heavily into:

```text
quotes
invoices
import
daily money brief
WhatsApp drafts
```

These are useful, but they make the product feel like:

```text
a quote/invoice follow-up app
```

instead of:

```text
a Business Execution OS with a money-action wedge
```

## Correction

Keep the money features, but label them correctly:

```text
Import        = capture automation for Collect/Core
Daily brief   = owner execution summary
WhatsApp draft = prepared action, not customer automation
Quotes/invoices = deep-work surfaces, not the center
```

The center remains:

```text
Assessment → Momentum Map → Today actions
```

## Final position

DueToday-Core is the compass.

DTC is the vehicle.

DueToday Collect is a module.

Import and invoice/quote automation belong to the module, not the entire product identity.
