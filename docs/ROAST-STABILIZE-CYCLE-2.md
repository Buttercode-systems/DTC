# DTC Roast + Stabilize Cycle 2

Date: 2026-07-09

## Focus

Make the first `/app` experience clearer.

The product risk after Cycle 1 was not the framework or the engine. It was the first useful moment after signup:

```text
User signs up
→ lands in Today
→ sees an empty or unclear list
→ does not know what to add first
```

## Stabilization applied

Added a first-use setup panel directly on the Today page when no open actions are due.

The panel gives three fast ways to create a real first DueToday action:

1. **Reply to one lead** — creates a new lead, which the engine turns into a `lead_response` action.
2. **Chase one quote** — creates an aged sent quote, which the engine turns into a `quote_followup` action.
3. **Chase one invoice** — creates an overdue customer invoice, which the engine turns into an `invoice_chase` action.

The goal is not bulk import yet. The goal is to get one real stuck item into Today fast.

## Guardrail

This cycle deliberately avoids:

- CSV import
- WhatsApp automation
- email automation
- payment gateway integration
- AI-generated follow-up messages
- source-app sync

Those should come after the manual first-use path proves what users actually enter first.

## Next cycle

After this, the next stabilization should be one of:

1. Add smoke tests around the public assessment/report/signup/app path.
2. Improve the signup handoff so assessment starter actions are clearly explained.
3. Add a lightweight import path for the most common source: open quotes or overdue invoices.
4. Move engine writes off page load into an explicit refresh action or scheduled job.
