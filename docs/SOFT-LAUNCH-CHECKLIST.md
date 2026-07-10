# DTC Soft Launch Checklist

Date: 2026-07-09

## Goal

Make DueToday safe enough for controlled soft launch:

```text
10 private testers first
then 20–50 soft-launch users
then product improvements based on real usage
```

This is not a mass launch checklist. It is the minimum gate for real testers.

## Must pass before inviting testers

### Product journey

- [ ] `/` loads and clearly explains the money-action promise.
- [ ] `/assessment` can be completed without login.
- [ ] Assessment submit creates a report token.
- [ ] `/report/[token]` loads the report.
- [ ] Report CTA sends user to signup with the assessment token.
- [ ] Signup works.
- [ ] Email confirmation works if enabled.
- [ ] Login redirects to `/app`.
- [ ] `/app` provisions or finds the business.
- [ ] First-use Today setup appears when there are no due actions.
- [ ] Lead quick-start creates a Today action.
- [ ] Quote quick-start creates a Today action.
- [ ] Invoice quick-start creates a Today action.
- [ ] User can mark an action done.
- [ ] User can toggle phone browser Desktop site on/off without breaking the session.

### Trust pages

- [ ] `/privacy` exists.
- [ ] `/terms` exists.
- [ ] `/early-access` exists.
- [ ] Footer links to the trust pages.
- [ ] Tester guide explains that DueToday is early access.
- [ ] Tester guide says not to use DueToday as the only business record system yet.
- [ ] Data deletion request path is explained.

### Feedback

- [ ] In-app feedback form appears inside `/app`.
- [ ] Feedback can be submitted by an authenticated tester.
- [ ] Feedback is stored in `soft_launch_feedback`.
- [ ] Feedback submission creates a `feedback_submitted` analytics event.
- [ ] Feedback appears in `/app/admin` for the founder admin account.

### Analytics/events

- [ ] `assessment_completed` is recorded.
- [ ] `report_viewed` is recorded.
- [ ] `signup_started` is recorded.
- [ ] `signup_created` is recorded.
- [ ] `app_opened` is recorded.
- [ ] `lead_created` is recorded.
- [ ] `quote_created` is recorded.
- [ ] `invoice_created` is recorded.
- [ ] `action_completed` is recorded.
- [ ] Events do not break the product if analytics insert fails.

### Admin dashboard

- [ ] `/app/admin` is restricted to emails in `soft_launch_admins`.
- [ ] Admin dashboard shows counts.
- [ ] Admin dashboard shows 7-day funnel events.
- [ ] Admin dashboard shows recent feedback.
- [ ] Admin dashboard shows recent events.
- [ ] Non-admin users cannot read the dashboard.

### Production health

- [ ] Latest Vercel production deployment is `READY`.
- [ ] No runtime errors after smoke test.
- [ ] No new `/auth/signin` 405 errors after mobile/desktop toggle.
- [ ] Supabase migration `0004_soft_launch_readiness.sql` is applied.
- [ ] RLS policies exist for feedback and analytics.
- [ ] `get_soft_launch_dashboard()` only works for admin emails.

## Soft-launch tester sequence

Use this exact invite flow:

```text
1. Send tester `/early-access`.
2. Ask them to take `/assessment`.
3. Ask them to create account from report.
4. Ask them to add one real lead, quote, or invoice.
5. Ask them to clear one Today action.
6. Ask them to submit in-app feedback.
7. Review `/app/admin` after each tester.
```

## Stop conditions

Pause invites immediately if any of these happen:

- Users cannot sign up or log in.
- Users get stuck before `/app`.
- Mobile view breaks again.
- Actions do not appear after adding lead/quote/invoice.
- Feedback cannot be submitted.
- Admin dashboard stops loading.
- Runtime errors appear during tester onboarding.

## What not to build before the first 10 testers

Do not add these until the first tester feedback is reviewed:

- WhatsApp automation
- email automation
- payment integration
- AI follow-up drafts
- advanced dashboards
- multi-user teams
- paid plans
- full CRM import

## Likely next feature after tester proof

If testers say manual entry is the main problem, build:

```text
Cycle 11 — Lightweight import for open quotes + overdue invoices
```

But only after the first tester feedback confirms it.
