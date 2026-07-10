# DTC QA Gates

Date: 2026-07-09

## Purpose

This document defines the evidence required before DTC changes are called ready.

Reality Checker defaults to:

```text
NEEDS_WORK
```

A cycle becomes READY only when evidence proves it.

## Universal PR gate

Every PR must show:

```text
PR URL
changed files
preview build result
scope confirmation
blocked scope confirmation
manual/e2e validation notes
known limitations
rollback or safe fallback
```

## Build gate

Required:

```text
npm run typecheck
npm run lint
npm run build
```

If GitHub Actions are unavailable, Vercel preview build can be used as temporary evidence, but this is not enough for final production maturity.

## Route gate

For user-facing route changes, verify:

```text
route returns 200 or expected auth redirect
mobile viewport works
desktop viewport works
copy does not misrepresent automation
empty state works
error state works
```

## Critical journey gates

### Assessment journey

```text
Landing → Assessment → Submit → Report → Signup CTA
```

Must prove:

- assessment page loads
- required answers validated
- report token created
- report loads
- report CTA works

### Auth/app journey

```text
Signup → Email confirmation → Login → /app
```

Must prove:

- login redirect works
- session cookies persist
- `/app` does not bounce
- mobile/desktop browser toggle does not break

### Today action journey

```text
Add record → Engine creates action → User completes action
```

Must prove:

- lead/quote/invoice action appears
- complete/snooze/dismiss works
- action does not duplicate after refresh

### Import journey

```text
Paste rows → Preview → Save → Engine → Today
```

Must prove:

- invalid rows show errors
- valid rows save
- duplicates skip
- Today updates

### Automation settings journey

```text
Open /app/automation → Save settings → Audit entry appears
```

Must prove:

- migration applied or safe fallback appears
- settings save does not enable autopilot
- audit log records change

### Daily brief journey

```text
Open /app/brief → Brief generated → Test send handled safely
```

Must prove:

- brief preview renders
- missing Resend env returns not_configured safely
- no customer message is sent

## Automation feature gate

Before any automation feature merges, prove:

```text
workflow spec exists
failure modes documented
security review completed
RLS review completed
queue/audit behavior defined
test plan exists
Reality Checker verdict recorded
```

## Scheduler gate

Before a scheduler or cron job is enabled:

```text
automation_settings UI exists
pause_until respected
quiet hours respected
idempotency key defined
sync_runs or audit logging exists
manual disable path exists
stuck queue visibility exists
```

## Sender gate

Before any customer-facing sender exists:

```text
requires_approval is enforced
approved_at is required
opt-out model exists
dispute model exists
quiet hours enforced
rate limit enforced
audit log enforced
message preview exists
owner can cancel
security review passes
```

Until then, all customer communication stays:

```text
draft only
copy only
click-to-send only
owner manual action
```

## Agent review gates

### Workflow Architect PASS requires

- happy path
- input failures
- timeouts
- transient failures
- permanent failures
- partial failures
- concurrent conflicts
- handoff contracts
- observable states

### Backend Architect PASS requires

- API/data contract
- timeout budget
- retry policy
- idempotency plan
- error codes
- audit event
- rollback/fallback path

### Database Optimizer PASS requires

- RLS owner isolation
- indexes for owner/status/date queries
- no obvious N+1 dashboard pattern
- migration safety notes
- retention strategy for high-volume tables

### Security Architect PASS requires

- trust boundaries
- data classification
- attack surfaces
- mitigations
- no secret leakage
- no customer automation bypass

### Test Automation Engineer PASS requires

- test plan
- deterministic selectors
- owned test data
- no hard sleeps
- artifact plan
- CI or repeat-run plan

### Reality Checker READY requires

- all claims match evidence
- route/journey evidence exists
- runtime errors checked when deployed
- known limitations stated
- no fantasy readiness claims

## Production readiness levels

### Level 1: Soft-launch ready

```text
manual smoke test passed
critical bugs fixed
feedback path exists
admin visibility exists
safe fallback states exist
```

### Level 2: Controlled production ready

```text
automated critical e2e tests
runtime monitoring
migration process
support/admin workflows
basic audit trails
no unsafe automation
```

### Level 3: Automation production ready

```text
source sync reliability
queue monitoring
scheduler observability
owner controls
audit trails
approval gates
security review
failure recovery
```

### Level 4: Approved-send ready

```text
all sender gates pass
opt-out/dispute/quiet-hour/rate-limit enforced
approval UX tested
audit evidence tested
sender rollback/cancel path tested
```

## Default verdict rule

If evidence is incomplete:

```text
NEEDS_WORK
```

If production deploy has not been verified:

```text
MERGED BUT NOT VERIFIED
```

If migration has not been applied:

```text
CODE READY, DB NOT READY
```

If a feature only works in preview:

```text
PREVIEW READY, PRODUCTION PENDING
```
