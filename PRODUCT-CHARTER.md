# DTC Product Charter

Date: 2026-07-09

## One-line definition

DTC is the working product implementation of DueToday Core: a Business Execution OS that diagnoses stuck work and turns it into clear actions due today.

## Customer-facing promise

```text
Find what is stuck. Know what to do next. Keep your business moving.
```

## Working daily promise

```text
Open Today. Clear the right actions. Keep the business moving.
```

The old money-first promise is still useful, but it is now subordinate:

```text
Know what money actions are due today.
```

Money is the urgent wedge, not the whole product.

## What we are building

We are building a Business Execution OS for small businesses.

The system works like this:

```text
Business Execution Assessment
→ Momentum Map / Execution Report
→ diagnosed stuck work
→ prioritized Today actions
→ daily execution rhythm
→ specialist modules only where needed
```

## Why this exists

Small businesses do not only fail because they lack information. They fail because work waits, ages, drifts, or gets forgotten.

The enemy is business inertia.

DTC exists to turn that inertia into visible, owned, daily action.

## Core workflow

```text
1. Diagnose before prescribing.
2. Show the Momentum Map.
3. Name the stuck work.
4. Create the first Today list.
5. Help the owner clear the list.
6. Feed Today from records/imports/adapters.
7. Recommend specialist modules only after the bottleneck is known.
```

## Product hierarchy

```text
Business Execution OS
│
├── Assessment
│   └── asks how work actually moves
├── Momentum Report
│   └── shows where execution is moving, slowing, or stuck
├── DueToday Core
│   └── daily action engine and Today queue
├── DueToday modules
│   ├── Leads  — acquire / lead response
│   ├── Collect — quotes, invoices, payments
│   └── Docs   — supplier/admin/document actions
└── Specialist systems
    ├── SoloBid  — Convert + Collect
    ├── RentEase — Deliver + Control + Collect
    └── RadFlow  — Deliver + Control + Lead
```

## What DTC is

DTC is:

- the live implementation of the DueToday Core product
- the assessment-to-action funnel
- the daily action queue
- the engine that converts business records into due actions
- the pilot vehicle for learning what small businesses actually need

## What DTC is not

DTC is not:

- a generic CRM
- an accounting system
- a debt collection tool
- a WhatsApp automation bot
- a finance dashboard
- a replacement for SoloBid, RentEase, or RadFlow
- a place where every possible business record must be deeply managed

## Navigation rule

Today is the product surface.

Records and automation are support surfaces.

```text
Today first
Assessment before recommendation
Actions before records
Records before automation
Automation before autopilot
```

## Money workflow rule

Leads, quotes, invoices and payment follow-ups are valid because they are often the fastest visible execution leak.

But they belong inside DueToday Collect / Core.

They must not redefine DTC as only a money app.

## Automation rule

Automate in this order:

```text
1. Capture data
2. Detect stuck work
3. Create actions
4. Draft messages
5. Brief the owner
6. Let the owner approve sends
7. Only later consider autopilot
```

Blocked for now:

- automatic customer WhatsApp sending
- automatic payment chasing
- accounting write-back
- cross-app write-back
- anything that hides the owner&apos;s judgement

## Feature decision rule

A feature belongs in DTC now only if it strengthens one of these:

```text
Assessment → Diagnosis → Today action → Daily rhythm → Feedback loop
```

A feature should wait if it primarily turns DTC into:

```text
a CRM, accounting app, dashboard, messaging bot, or generic admin system
```

## Current correction

Cycle 11 import and daily brief automation are not wrong. They are useful.

But they must be positioned as support features for DueToday Collect/Core, not as the center of the product.

The center remains:

```text
Diagnosed stuck work → actions due today
```
