# Smoke Tests

Date: 2026-07-09

## Purpose

These tests provide a production-safe evidence gate for DTC before more automation is built.

They do not require user credentials and do not send customer messages.

## Test command

```bash
npm install
npx playwright install chromium
npm run test:smoke
```

By default, the tests run against:

```text
https://dtc-xi-sable.vercel.app
```

To run against another URL:

```bash
PLAYWRIGHT_BASE_URL=https://your-preview-url.vercel.app npm run test:smoke
```

## Current coverage

### Public funnel

```text
/ loads
/assessment loads from CTA
assessment profile step starts
/early-access loads
/privacy loads
/terms loads
```

### API safety

```text
POST /api/assessment rejects invalid submissions with 400
/report/[bad-token] returns 404
```

### Auth protection

```text
/app redirects to login
/app/import redirects to login
/app/automation redirects to login
/app/admin redirects to login
```

### Viewports

Tests run on:

```text
chromium-desktop
chromium-mobile
```

## What these tests intentionally do not do yet

They do not:

- create a real account
- complete a full assessment submission
- write production records
- send email
- test authenticated app flows
- test Supabase RLS directly
- test paid/customer-message automation

## Why not test everything now?

Cycle 17 is the first evidence gate. It is intentionally safe and credential-free.

Full authenticated tests need controlled test credentials, test-data cleanup, and stronger database isolation.

## Next smoke-test expansion

Future cycles should add:

```text
1. Full assessment submit → report token test using a dedicated test environment
2. Signup/login smoke using a controlled test user
3. Import preview/save smoke using controlled test data
4. Automation settings save → audit row smoke after Cycle 13 migration is live
5. Today action lifecycle smoke: complete/snooze/dismiss
```

## CI

GitHub Actions workflow:

```text
.github/workflows/smoke-tests.yml
```

It runs on:

```text
manual workflow dispatch
pull requests to main
pushes to main
```

The workflow accepts a manual `base_url` input and also respects the repo variable:

```text
PLAYWRIGHT_BASE_URL
```

## Reality Checker rule

A cycle cannot claim production readiness unless smoke-test evidence is attached or the limitation is clearly stated.
