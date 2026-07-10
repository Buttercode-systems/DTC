# DTC Test Data Guide

Use this guide when running the smoke test manually.

## Test business

```text
Owner name: Smoke Test Owner
Company: Smoke Test Plumbing
Phone: 0712345678
Industry: Home services / trades
Team size: 2–5
```

## Assessment answer pattern

Do not answer everything perfectly. Use realistic mixed answers so the report has useful recommendations.

Suggested pattern:

```text
Acquire: weak on speed-to-lead, moderate elsewhere
Convert: weak on quote follow-up
Deliver: moderate
Collect: weak on overdue invoice chasing
Control: moderate
Improve: weak on review rhythm
Lead: moderate
```

## First-use quick-start data

### Lead

```text
Lead name: Test Lead One
Phone: 0712345678
Source: WhatsApp
Notes: Asked for a plumbing quote and has not received a reply.
```

Expected Today action:

```text
Reply to new lead — Test Lead One
```

### Quote

```text
Quote number: QT-SMOKE-001
Amount: 2500
Description: Geyser repair quote for Test Customer
```

Expected Today action:

```text
Follow up Quote #QT-SMOKE-001
```

### Invoice

```text
Invoice number: INV-SMOKE-001
Amount: 1800
Description: Completed emergency call-out for Test Customer
Due date: yesterday
```

Expected Today action:

```text
Chase Invoice #INV-SMOKE-001
```

## Cleanup options

For now, cleanup can be manual through Supabase if needed.

Minimum cleanup target:

- remove the test auth user
- remove the test business
- remove related test customers, leads, quotes, invoices, payment promises and actions

Do not run destructive cleanup on production unless the test account is clearly identifiable.

## Naming convention

Use this prefix for anything created manually during QA:

```text
SMOKE-
```

Examples:

```text
QT-SMOKE-001
INV-SMOKE-001
Smoke Test Plumbing
smoke-test+20260709@example.com
```

This makes it easier to find and remove test records later.
