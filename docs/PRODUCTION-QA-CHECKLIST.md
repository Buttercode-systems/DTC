# DTC Production QA Checklist

Use this after every production deployment until automated E2E tests exist.

## Deployment

- [ ] Latest Vercel production deployment is `READY`.
- [ ] Deployment commit matches merged `main` commit.
- [ ] Build log shows compile success.
- [ ] Build log shows lint/type validation success.
- [ ] No deployment alias error.

## Public pages

- [ ] `/` loads.
- [ ] `/assessment` loads.
- [ ] `/login` loads.
- [ ] `/signup` loads.
- [ ] Invalid `/report/not-a-real-token` fails gracefully.

## Public assessment

- [ ] Assessment can start without authentication.
- [ ] Business type selection works.
- [ ] Team size selection works.
- [ ] User can move through all seven jobs.
- [ ] User cannot submit before required answers/profile are present.
- [ ] Assessment submit creates a token.
- [ ] Token report page loads.

## Auth and provisioning

- [ ] Signup from report includes the assessment token.
- [ ] Supabase confirmation email path is clear if email confirmation is enabled.
- [ ] Confirmed user can log in.
- [ ] Auth callback does not error.
- [ ] `/app` provisions or finds the user business.
- [ ] No duplicate business is created for the same user on repeated `/app` visits.

## Today app

- [ ] `/app` loads for authenticated user.
- [ ] First-use setup panel appears when no actions are due.
- [ ] Lead quick-start can create a lead.
- [ ] Quote quick-start can create an aged quote.
- [ ] Invoice quick-start can create an overdue invoice.
- [ ] Engine creates at least one Today action after records exist.
- [ ] User can mark an action done.
- [ ] User can snooze an action.
- [ ] User can dismiss an action.
- [ ] Cleared Today section updates after completion.

## Core app pages

- [ ] `/app/leads` loads and lists leads.
- [ ] `/app/quotes` loads and lists quotes.
- [ ] `/app/invoices` loads and lists invoices.
- [ ] `/app/customers` loads and lists customers.
- [ ] `/app/pipeline` loads and shows money/work buckets.
- [ ] `/app/settings` loads and can save settings.

## Security sanity check

- [ ] Anonymous user cannot access `/app`.
- [ ] Anonymous user cannot access `/app/leads`.
- [ ] Anonymous user cannot access `/app/quotes`.
- [ ] Anonymous user cannot access `/app/invoices`.
- [ ] Anonymous user cannot call authenticated provisioning directly.
- [ ] Public assessment/report routes still work.

## Runtime logs

- [ ] No new Vercel production runtime errors after QA.
- [ ] No auth callback errors.
- [ ] No `/api/assessment` errors.
- [ ] No `/app` server errors.
- [ ] No Supabase permission/RLS errors during the test.

## Decision

```text
PASS = product can receive pilot traffic.
FAIL = fix before adding new features.
```
