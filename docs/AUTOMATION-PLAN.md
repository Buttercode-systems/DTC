# DTC Automation Plan

Date: 2026-07-09

## Principle

DTC automates awareness, preparation, and tracking before it automates communication.

Safe now:

```text
Detect automatically
Create Today actions automatically
Draft messages automatically
Send owner brief manually / by approved schedule
```

Not safe yet:

```text
Send customer WhatsApps automatically
Chase payments without owner approval
Make collection decisions automatically
Replace accounting/CRM systems
```

## Automation ladder

### Level 1 — Capture automation

Goal: get real money items into DTC quickly.

Implemented in Cycle 11:

- `/app/import`
- paste/CSV import for open quotes
- paste/CSV import for unpaid invoices
- client-side preview before saving
- duplicate number skipping
- customer creation/reuse

### Level 2 — Detection automation

Goal: DTC finds what is stuck.

Implemented before Cycle 11 and used here:

- quote follow-up rules
- overdue invoice chase rules
- lead response rules
- promised payment check rules
- recurring invoice reminders

Cycle 11 addition:

- import save immediately runs the Today engine

### Level 3 — Daily brief automation

Goal: owner sees the day before it gets noisy.

Implemented foundation in Cycle 11:

- `/app/brief`
- generated daily brief preview
- safe test-send action
- Resend support through `RESEND_API_KEY` and `DAILY_BRIEF_FROM` / `RESEND_FROM`

Current limitation:

- owner-triggered only
- not scheduled yet
- no service-role key required

Future scheduling requires one of these choices:

1. service-role cron route that loops businesses safely
2. per-business scheduled jobs
3. external automation that calls a protected endpoint

### Level 4 — Draft automation

Goal: DTC prepares words, owner decides.

Implemented in Cycle 11:

- WhatsApp draft links on Today actions
- copy draft button
- no automatic customer messaging

### Level 5 — Approved-send automation

Future only.

Possible flow:

```text
Owner selects 5 actions
DTC shows message drafts
Owner approves
DTC sends
DTC logs outcome
```

### Level 6 — Autopilot

Future only, after user trust and compliance rules are clear.

Possible safe autopilot areas:

- daily owner reminders
- internal team reminders
- recurring admin reminders

Do not autopilot customer payment chasing until users explicitly demand it and approval/opt-out/dispute controls exist.

## Cycle 11 shipped scope

- `/app/import`
- paste/CSV import for quotes and invoices
- import preview before saving
- automatic engine run after import
- `/app/brief`
- daily brief email foundation
- WhatsApp/copy follow-up drafts
- this plan

## Tester script

Ask testers to do this:

```text
1. Open /app/import
2. Paste 5 open quotes or overdue invoices
3. Preview rows
4. Save valid rows
5. Open Today
6. Use one WhatsApp draft or copy draft
7. Mark one action done
8. Open /app/brief
9. Read daily brief preview
10. Submit feedback
```

## Stop conditions

Pause automation work if:

- import creates duplicate records unexpectedly
- Today does not update after import
- draft messages sound risky or aggressive
- daily brief sends to the wrong email
- testers ask for accounting/payment sync before they trust manual Today actions

## Next likely cycle

Cycle 12 should not be full automation. It should be based on tester feedback.

Likely options:

1. CSV template download
2. import mapping editor
3. scheduled owner daily brief
4. better quote/invoice draft templates
5. bulk action completion

Decision rule:

```text
Build the next automation only when tester behavior proves the friction.
```
