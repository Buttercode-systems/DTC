# WORKFLOW — Daily Brief Preview and Test Send

Date: 2026-07-09
Status: Approved

## Purpose

Generate an owner-facing summary of Today actions and optionally send a test email to the authenticated owner.

This is not a scheduler and not a customer sender.

## Code evidence

```text
lib/daily-brief.ts
app/app/actions.ts#sendDailyBriefTest
/app/brief page
```

## Trigger

```text
User opens /app/brief
or
User clicks test-send daily brief
```

## Primary actor

```text
Business owner
```

## Happy path — preview

```text
1. User opens /app/brief.
2. Page requires authenticated business context.
3. generateDailyBrief runs the action engine.
4. Brief loads open actions due today.
5. Brief counts actionCount, moneyCount and leadCount.
6. Brief produces subject, text and HTML.
7. Page renders brief preview.
```

## Happy path — test send

```text
1. User clicks send test brief.
2. sendDailyBriefTest loads business context and owner email.
3. generateDailyBrief runs engine and builds brief.
4. If user email is missing, redirect with no_email reason.
5. sendDailyBriefEmail checks RESEND_API_KEY and sender env.
6. If not configured, returns not_configured without throwing.
7. If configured, sends owner-facing email through Resend.
8. Track daily_brief_tested analytics event.
9. Redirect back to /app/brief with sent status and action count.
```

## Input failures

| Failure | Current behavior | Future improvement |
|---|---|---|
| No user email | redirect reason=no_email | keep |
| No due actions | brief says no due actions | keep |
| Resend env missing | returns not_configured | keep |

## Timeout/transient failures

| Failure | Current behavior | Future behavior |
|---|---|---|
| Engine timeout | brief generation fails | future queue/audit failure row |
| Resend timeout | returns failed if fetch throws | add retry queue later |
| Resend non-OK | status failed | add reason/error code later |

## Permanent failures

| Failure | Current behavior | Future behavior |
|---|---|---|
| Missing Resend key/from | not_configured | keep safe default |
| Invalid owner email | send fails | validate before queue/sender |

## Partial failures

```text
Brief may generate but email send fails.
Current behavior tracks status failed/not_configured and redirects.
Future scheduled version should write notification_queue and action_audit_log.
```

## Concurrent conflicts

```text
Multiple test sends can send multiple owner emails.
This is acceptable while manual/test-only.
Future scheduler must dedupe daily owner brief queue items per business/date/channel.
```

## Observable states

Owner sees:

```text
brief preview
send status query result
not_configured/failed/sent state
```

Database sees:

```text
actions may be generated/reconciled by engine
analytics event daily_brief_tested
```

Operator sees:

```text
analytics event and Vercel runtime logs if send fails noisily
```

## Handoff contract

```text
HANDOFF: /app/brief -> generateDailyBrief
PAYLOAD: { supabase, businessId, businessName, settings }
SUCCESS RESPONSE: { subject, text, html, actionCount, moneyCount, leadCount }
FAILURE RESPONSE: unhandled server error today
TIMEOUT: platform default
ON FAILURE: future audit/queue failure
AUDIT EVENT: none today for preview
```

```text
HANDOFF: sendDailyBriefTest -> Resend API
PAYLOAD: { from, to, subject, text, html }
SUCCESS RESPONSE: { sent: true, status: sent }
FAILURE RESPONSE: { sent: false, status: not_configured|failed }
TIMEOUT: fetch/platform default
ON FAILURE: redirect with sent status
AUDIT EVENT: daily_brief_tested analytics event
```

## QA requirements

```text
- Brief page renders with zero actions.
- Brief page renders with due actions.
- Test send without Resend env returns not_configured safely.
- No customer message is sent.
- generateDailyBrief runs engine before reading actions.
- Future scheduler must dedupe one brief per business/date/channel.
```

## Status

```text
Approved for current manual preview/test implementation.
Scheduled queue version must get a separate spec before build.
```
