# DTC Roast + Stabilize Cycle 3

Date: 2026-07-09

## Focus

Prove the full journey before adding features.

The product now has a stronger first-use Today experience, but that only matters if the full path works:

```text
Landing
→ Assessment
→ Report
→ Signup
→ Business provisioning
→ /app Today
→ Quick-start data entry
→ Engine-created action
→ Action completed
```

## Roast

DTC is now good enough to look usable, which makes the next risk more dangerous: hidden handoff failures.

The riskiest handoffs are:

1. assessment submit → report token
2. report CTA → signup with assessment token
3. signup/email confirmation → login/session
4. authenticated session → business provisioning
5. empty Today → first-use setup panel
6. quick-start record → engine-created action
7. action done → underlying record updated so action does not immediately reappear

These must be tested as one journey, not as isolated pages.

## Stabilization applied

Added:

- `docs/E2E-SMOKE-TEST-PLAYBOOK.md`
- `docs/PRODUCTION-QA-CHECKLIST.md`
- `docs/TEST-DATA-GUIDE.md`

## Decision gate

No new product features until this test passes at least once against production or a production-equivalent preview.

Feature work blocked until pass:

- bulk import
- WhatsApp automation
- email automation
- AI drafting
- payment integrations
- source-app sync

## Recommended next cycle after PASS

Cycle 4 should be lightweight import for the highest-value source:

```text
Open quotes + overdue invoices
```

Why: those are closest to money and most likely to create an immediately useful Today list.

## Recommended next cycle after FAIL

Fix the failing handoff first. Do not add features to a broken funnel.
