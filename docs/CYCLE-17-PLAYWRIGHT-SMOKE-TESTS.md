# Cycle 17 — Playwright Production Smoke Tests

Date: 2026-07-09

## Goal

Add production-safe Playwright smoke tests before building more automation.

This cycle follows the Cycle 15/16 rule:

```text
Workflow map first. Evidence gate second. Automation later.
```

## What this cycle adds

```text
playwright.config.mjs
tests/smoke/public-funnel.spec.js
tests/smoke/api-and-protected-routes.spec.js
.github/workflows/smoke-tests.yml
docs/SMOKE-TESTS.md
```

Updates:

```text
package.json
.gitignore
README.md
```

## Smoke coverage

### Public funnel

```text
/ landing page
/assessment profile step
/early-access
/privacy
/terms
```

### API and route safety

```text
POST /api/assessment invalid payload → 400
/report/[bad-token] → 404
/app → login
/app/import → login
/app/automation → login
/app/admin → login
```

### Viewports

```text
chromium-desktop
chromium-mobile
```

## Default target

Tests default to:

```text
https://dtc-xi-sable.vercel.app
```

Override with:

```bash
PLAYWRIGHT_BASE_URL=https://your-url.vercel.app npm run test:smoke
```

## What this cycle does not test yet

This cycle does not test:

```text
real signup
real login
full assessment save
authenticated app flows
record creation
import save
Today action lifecycle
email send
Gmail/Sheets
scheduler
approved-send
```

Those need controlled test credentials, test data cleanup and safer database isolation.

## Why this matters

From this point, every future automation cycle can attach smoke-test evidence instead of saying “it should work.”

## Next recommended cycle

```text
Cycle 18 — Apply Automation Migration + Settings Smoke
```

Why:

Cycle 13 migration is still the live blocker for `/app/automation` saving settings. Before building schedulers, apply the migration and add a smoke path for automation settings/audit.

Alternative if migration is handled manually first:

```text
Cycle 18 — Scheduled Owner Daily Brief Queue
```

Only owner-facing queue creation. No customer senders.
