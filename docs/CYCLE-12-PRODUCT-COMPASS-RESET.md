# Cycle 12 — Product Compass Reset

Date: 2026-07-09

## Trigger

After Cycle 10 and Cycle 11, DTC became much more launch-ready:

- trust pages
- feedback capture
- admin dashboard
- analytics
- import automation
- daily brief foundation
- WhatsApp/copy drafts

But the build began drifting toward a money-first app.

This cycle re-anchors DTC around the Business Execution OS.

## Finding

The money wedge is useful, but it must not swallow the product.

DTC should not be framed as:

```text
a quote/invoice chase app
```

DTC should be framed as:

```text
a Business Execution OS that diagnoses stuck work and turns it into actions due today
```

## Decision

Money workflows remain in the product, but they are repositioned as DueToday Collect / Core support features.

The center of the product is reset to:

```text
Assessment
→ Momentum Report
→ diagnosed stuck work
→ Today action queue
→ daily rhythm
```

## Changes in this cycle

- Adds `PRODUCT-CHARTER.md`
- Adds `docs/DTC-VS-DUETODAY-CORE.md`
- Adds `docs/PRODUCT-HIERARCHY.md`
- Adds `docs/MODULE-BOUNDARIES.md`
- Updates landing page positioning away from pure money-first language
- Demotes Import and Brief in app navigation
- Updates README with the product compass
- Aligns root HTML metadata with the product compass

## Hard guardrails

No new feature should be built until it passes the compass:

```text
Does it strengthen assessment → diagnosis → Today action → daily rhythm?
```

If not, the feature waits.

## What we keep

Keep these, but label them correctly:

```text
/app/import   = capture automation
/app/brief    = owner rhythm
quotes        = DueToday Collect record feeder
invoices      = DueToday Collect record feeder
WhatsApp draft = owner-approved action support
```

## What we stop doing

Stop framing the product as only:

```text
money actions
quote follow-up
invoice chasing
customer messages
```

That is a module.

The product is larger.

## Current north star

```text
Find what is stuck.
Know what to do next.
Keep your business moving.
```

## Deployment note

The metadata follow-up was merged after the main Cycle 12 PR. This note records that the final production rebuild must include the metadata correction.
