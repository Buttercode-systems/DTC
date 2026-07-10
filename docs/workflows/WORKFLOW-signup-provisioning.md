# WORKFLOW — Signup and Business Provisioning

Date: 2026-07-09
Status: Approved

## Purpose

Convert a report visitor or direct user into an authenticated DueToday business account with an owner-scoped business record.

## Code evidence

```text
app/signup/actions.ts
lib/db.ts
provision_my_business RPC
Supabase Auth
```

## Trigger

```text
User submits signup form
or
confirmed user opens authenticated app for the first time
```

## Primary actor

```text
Business owner
```

## Happy path A — Signup with active session

```text
1. User submits email, password, business_name and optional assessment token.
2. signUp validates email/password/business name.
3. signUp tracks signup_started.
4. Supabase Auth creates user.
5. business_name and assessment_token are stored in user metadata.
6. signUp tracks signup_created.
7. If Supabase returns a live session, signUp calls provision_my_business RPC.
8. User redirects to /app.
9. /app calls requireBusiness().
10. requireBusiness finds business and returns it.
```

## Happy path B — Signup requiring email confirmation

```text
1. User submits signup form.
2. Supabase Auth creates user but returns no live session.
3. User sees notice to confirm email.
4. User confirms email and signs in.
5. User opens /app.
6. requireBusiness() checks auth user.
7. No business exists yet.
8. requireBusiness reads business_name and assessment_token from user metadata.
9. requireBusiness calls provision_my_business RPC.
10. requireBusiness retries business lookup.
11. App renders with business context.
```

## Input validation failures

| Failure | Current behavior | Future improvement |
|---|---|---|
| Missing business name | returns form error | keep |
| Password under 8 chars | returns form error | keep |
| Missing email | returns form error | keep |
| Bad Supabase auth response | returns Supabase error message | sanitize if needed |
| Invalid next path on sign-in | redirects to /app unless path starts `/` | keep |

## Timeout/transient failures

| Failure | Current behavior | Future improvement |
|---|---|---|
| Supabase Auth timeout | error returned by Supabase | add retry guidance in UI |
| provision_my_business timeout | not explicitly handled in signUp | handle with safe retry/fallback later |

## Permanent failures

| Failure | Current behavior | Future improvement |
|---|---|---|
| provision_my_business RPC missing | app cannot provision business | migration health check |
| User metadata missing business name | requireBusiness uses `My business` | consider asking user to confirm name |
| User has no business after retry | redirect /signup | keep but add support note later |

## Partial failures

```text
Auth user created but business provisioning fails:
- user may be able to sign in but /app cannot load business.
- requireBusiness retries provisioning on first authenticated visit.
- future improvement: expose clear setup recovery page instead of generic redirect.
```

## Concurrent conflicts

```text
User opens multiple authenticated tabs before business exists:
- provision_my_business must be idempotent by owner_id.
- current workflow depends on RPC safety.
```

## Observable states

Customer sees:

```text
signup form
confirmation notice
login form
/app once provisioned
```

Operator sees:

```text
signup_started analytics
signup_created analytics
potential provisioning issues only through logs today
```

Database sees:

```text
auth user
businesses row
assessment claimed if token supplied
```

Logs see:

```text
No dedicated provisioning audit log yet.
```

## Handoff contract

```text
HANDOFF: Signup form -> signUp server action
PAYLOAD: { email, password, business_name, assessment? }
SUCCESS RESPONSE: redirect /app or notice to confirm email
FAILURE RESPONSE: { error: string }
TIMEOUT: platform default
ON FAILURE: show form error
AUDIT EVENT: signup_started, signup_created analytics events
```

```text
HANDOFF: requireBusiness -> provision_my_business RPC
PAYLOAD: { p_business_name, p_assessment_token? }
SUCCESS RESPONSE: business row exists for auth.uid()
FAILURE RESPONSE: no business after retry
TIMEOUT: platform default
ON FAILURE: redirect /signup today; future setup recovery page
AUDIT EVENT: missing today
```

## QA requirements

```text
- Signup rejects missing business/name/password.
- Signup with assessment token carries token into metadata.
- Confirmed user opening /app provisions business if missing.
- User without session redirects to /login.
- User with business loads /app without bounce.
- Multiple app opens do not create duplicate businesses.
```

## Status

```text
Approved for current implementation.
Needs e2e auth/session coverage.
```
