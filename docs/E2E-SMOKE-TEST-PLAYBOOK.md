# DTC End-to-End Smoke Test Playbook

Date: 2026-07-09

## Purpose

This playbook proves the full DueToday loop before new features are added.

The path under test is:

```text
Landing
→ Assessment
→ Report
→ Signup
→ Business provisioning
→ /app Today
→ Add first lead / quote / invoice
→ Engine creates Today action
→ Mark action done
```

## Pass/fail rule

Do not add import, WhatsApp automation, AI drafting, payment integrations, or source-app sync until this smoke test passes.

A pass means:

- the user can complete the public assessment without confusion
- the report is created and accessible by token
- signup works from the report CTA
- the user reaches `/app`
- a business exists for the signed-in user
- the first-use Today panel appears when there are no due actions
- at least one quick-start record creates a real Today action after refresh
- the action can be completed
- no production runtime errors appear during the test window

## Required setup

Use a clean browser profile or incognito window.

Use a disposable email address that can receive Supabase confirmation emails if email confirmation is enabled.

Before testing, confirm:

- production Vercel deployment is `READY`
- Supabase auth Site URL and Redirect URLs include the production domain
- `NEXT_PUBLIC_SUPABASE_URL` is set in Vercel
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set in Vercel
- migrations in `supabase/migrations/` are applied

## Test identity

Use one test business:

```text
Name: Smoke Test Owner
Email: smoke-test+YYYYMMDD@example.com
Company: Smoke Test Plumbing
Phone: 0712345678
Business type: Home services / trades
Team size: 2–5
```

If using a real inbox, replace the email with a controlled test inbox.

## Step 1 — Landing page

Path:

```text
/
```

Expected:

- Page loads without auth.
- Money-first promise is visible.
- Assessment CTA is visible.
- No console/runtime error appears.

Pass/fail:

```text
PASS if the user understands this is about missed follow-up and money actions.
FAIL if the page reads like a vague framework or the CTA is hard to find.
```

## Step 2 — Assessment

Path:

```text
/assessment
```

Run through the assessment as a real service business owner.

Use mixed answers, not all perfect scores. Pick at least:

- one weak lead-response answer
- one weak quote-follow-up answer
- one weak payment/invoice answer
- one stronger answer elsewhere

Expected:

- Business type and team size can be selected.
- All 35 answers can be selected.
- Navigation works through all seven jobs.
- Progress is clear.
- Final contact form accepts the test user.

Pass/fail:

```text
PASS if the assessment feels practical and can be completed in one sitting.
FAIL if any question/answer feels mismatched, unclear, or blocked.
```

## Step 3 — Report creation

Submit the assessment.

Expected:

- `/api/assessment` returns successfully.
- User is redirected to `/report/[token]`.
- Report shows an Execution Score.
- Report shows Momentum Map / diagnosis / recommendations / first Today list.
- CTA to install/start DueToday exists.

Pass/fail:

```text
PASS if the report is specific enough to make the user want the Today app.
FAIL if the report feels generic or the token route fails.
```

## Step 4 — Signup from report

Click the report CTA.

Expected:

- User lands on `/signup?assessment=TOKEN`.
- Signup form loads.
- Email/password signup submits.
- If confirmation is required, the user sees a clear confirmation message.
- If session is active immediately, user is provisioned and redirected toward `/app`.

Pass/fail:

```text
PASS if the user knows exactly what to do after submitting signup.
FAIL if auth leaves the user stuck between signup, login, confirmation, and app.
```

## Step 5 — Business provisioning

After login/confirmation, visit:

```text
/app
```

Expected:

- `requireBusiness()` finds or provisions the business.
- User does not see a raw error.
- The business name/settings exist.
- Today page loads.

Pass/fail:

```text
PASS if the signed-in user reaches Today without manual database work.
FAIL if the business is missing, duplicated, or provisioning errors.
```

## Step 6 — First Today list

On `/app`, if there are no open actions, the first-use setup panel should appear.

Expected quick-start cards:

- Reply to one lead
- Chase one quote
- Chase one invoice

Run all three quick starts in separate passes if possible.

### 6A — Lead quick start

Create:

```text
Lead name: Test Lead One
Phone: 0712345678
Source: WhatsApp
Notes: Asked for plumbing quote
```

Expected:

- Lead is inserted.
- After refresh / engine run, Today shows a `lead_response` action.
- Action can be marked done.
- Lead status becomes responded.

### 6B — Quote quick start

Create:

```text
Quote number: QT-SMOKE-001
Amount: 2500
Description: Geyser repair quote
```

Expected:

- Quote is inserted as sent and aged enough for follow-up.
- After refresh / engine run, Today shows a `quote_followup` action.
- Action can be marked done.
- Quote last follow-up timestamp is updated.

### 6C — Invoice quick start

Create:

```text
Invoice number: INV-SMOKE-001
Amount: 1800
Description: Completed call-out
Due date: yesterday
```

Expected:

- Invoice is inserted as customer/sent/overdue.
- After refresh / engine run, Today shows an `invoice_chase` action.
- Action can be marked done.
- Invoice last chase timestamp is updated.

Pass/fail:

```text
PASS if at least one quick-start creates a real actionable Today item and it can be completed.
FAIL if the quick-start creates data but Today remains empty or action completion fails.
```

## Step 7 — Runtime checks

After the smoke test, check Vercel runtime errors for the production deployment.

Expected:

- No new serverless errors during the smoke-test window.
- No auth callback errors.
- No API assessment errors.
- No app provisioning errors.

Pass/fail:

```text
PASS if runtime logs are clean or only contain known non-blocking warnings.
FAIL if the smoke test creates server errors, auth errors, or database errors.
```

## Known risks to watch

1. Email confirmation may interrupt the signup flow.
2. Supabase Redirect URLs may not include the exact production domain.
3. `provision_my_business` must be callable by authenticated users only.
4. The first-use panel creates records, but the engine runs on `/app` load, so the user may need a refresh after submit.
5. Quote quick-start creates a quote without a customer; the action should still be useful, but customer contact will be missing.
6. Invoice quick-start creates an invoice without a customer; the action should still surface, but WhatsApp/call links will be unavailable.

## Stop conditions

Stop and fix before adding features if any of these happen:

- assessment submit fails
- report token page fails
- signup cannot complete
- confirmed user cannot reach `/app`
- Today quick-start does not create actionable work
- complete/snooze/dismiss action fails
- Vercel shows production runtime errors during the test

## Result log template

```text
Date:
Tester:
Environment: production / preview
Deployment URL:
Supabase project:
Test email:

Landing: PASS / FAIL
Assessment: PASS / FAIL
Report: PASS / FAIL
Signup: PASS / FAIL
Provisioning: PASS / FAIL
First Today list: PASS / FAIL
Lead quick-start: PASS / FAIL
Quote quick-start: PASS / FAIL
Invoice quick-start: PASS / FAIL
Action completion: PASS / FAIL
Runtime logs: PASS / FAIL

Blockers:
Notes:
Decision: PASS / FIX BEFORE FEATURES
```
