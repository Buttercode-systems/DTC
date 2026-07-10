# WORKFLOW — Assessment to Report

Date: 2026-07-09
Status: Approved

## Purpose

Turn a public Business Execution Assessment submission into a private Momentum Report link.

## Code evidence

```text
app/api/assessment/route.ts
app/report/[token]/page.tsx
lib/scoring.ts
lib/framework.ts
submit_assessment RPC
get_assessment RPC
```

## Trigger

```text
User submits assessment form → POST /api/assessment
```

## Primary actor

```text
Public visitor / business owner
```

## Happy path

```text
1. User completes all assessment answers.
2. User provides name and valid email.
3. Browser sends JSON to POST /api/assessment.
4. API validates JSON body.
5. API validates answers.
6. API validates industry and team size.
7. API validates lead name/email.
8. API scores answers with scoreAssessment().
9. API creates private report token.
10. API calls submit_assessment RPC with lead, answers and scores.
11. API tracks assessment_completed.
12. API returns { token }.
13. Frontend routes user to /report/[token].
14. Report page calls get_assessment RPC.
15. If assessment exists, render score, Momentum Map, bottlenecks, recommendations and starter Today list.
16. Report tracks report_viewed.
17. CTA points to /signup?assessment=token if unclaimed, otherwise /app.
```

## Input validation failures

| Failure | Current behavior | Desired future improvement |
|---|---|---|
| Invalid JSON | returns 400 Invalid request | keep |
| Missing answers | returns 400 Please answer every question | keep |
| Invalid industry | returns 400 Choose an industry | keep |
| Invalid team size | returns 400 Choose a team size | keep |
| Missing name/email | returns 400 A name and valid email needed | keep |
| Scoring exception | not explicitly caught | add defensive error handling later |

## Timeout/transient failures

| Failure | Current behavior | Required future behavior |
|---|---|---|
| Supabase RPC timeout | likely 500 from error path | log stable error code |
| Analytics tracking fails | tracking function should not block journey | verify behavior in tests |

## Permanent failures

| Failure | Current behavior | Required future behavior |
|---|---|---|
| submit_assessment RPC missing | 500 Could not save assessment | migration/health check should catch |
| get_assessment RPC missing | report not found/error | migration/health check should catch |
| Token does not exist | `notFound()` | keep |

## Partial failures

```text
Assessment save succeeds but analytics fails:
- user should still receive report token.
- analytics must never block report creation.
```

## Concurrent conflicts

```text
Token collision is theoretically possible but unlikely.
Future hardening: retry token creation on unique constraint failure if needed.
```

## Observable states

Customer sees:

```text
assessment form
validation error
report page
signup/install CTA
```

Operator sees:

```text
analytics event assessment_completed
analytics event report_viewed
soft-launch funnel counts in admin dashboard
```

Database sees:

```text
assessment row with token, lead info, answers, scores
analytics_events rows
claimed flag changes later during provisioning
```

Logs see:

```text
No explicit structured error log yet.
```

## Handoff contract

```text
HANDOFF: Assessment UI -> POST /api/assessment
PAYLOAD: { answers, industry, team_size, lead: { full_name, email, company?, phone? } }
SUCCESS RESPONSE: { token: string }
FAILURE RESPONSE: { error: string }
TIMEOUT: platform default
ON FAILURE: show user error and allow retry
AUDIT EVENT: assessment_completed analytics event on success
```

```text
HANDOFF: Report page -> get_assessment RPC
PAYLOAD: { p_token: string }
SUCCESS RESPONSE: assessment + scores + claimed flag
FAILURE RESPONSE: null/not found
TIMEOUT: platform default
ON FAILURE: render 404
AUDIT EVENT: report_viewed analytics event on success
```

## QA requirements

```text
- Submitting empty assessment shows validation.
- Valid assessment returns token.
- Report route loads for token.
- Invalid token returns not found.
- Report CTA routes to signup when unclaimed.
- No service-role key is used in route.
```

## Status

```text
Approved for current implementation.
Needs Playwright/API test coverage.
```
