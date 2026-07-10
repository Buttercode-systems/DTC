# Module Boundaries

Date: 2026-07-09

## Why this matters

DTC is at risk of becoming a money-first CRM because quotes, invoices, import and WhatsApp drafts are visible and useful.

Those features are allowed, but they need boundaries.

## Boundary rule

```text
DTC Core owns Today.
Modules own specialist workflows.
Entity pages support actions.
Reports explain history.
```

## DueToday Core

Owns:

- Today queue
- action lifecycle
- due/overdue/stuck logic
- Momentum Report starter actions
- owner daily rhythm
- daily brief summary
- action priority rules

Does not own:

- full CRM depth
- accounting reconciliation
- payment gateway logic
- customer automation without approval
- specialist app replacement

## DueToday Leads

Owns:

- lead capture
- response time actions
- missed lead escalation
- lead source visibility
- lead-to-quote next steps

Does not own:

- full marketing suite
- ad management
- mass messaging
- automatic spammy follow-up

## DueToday Collect

Owns:

- quote follow-up
- invoice chase
- promised payment checks
- recurring invoice actions
- import for open quotes and unpaid invoices
- payment status actions

Does not own:

- accounting as source of truth
- debt collection automation
- payment gateway settlement
- legal collections
- customer messaging without approval

## DueToday Docs

Owns:

- supplier/admin document capture
- supplier invoice approval actions
- missing document actions
- admin follow-up actions

Does not own:

- full document management system
- accounting write-back
- HR document vault

## Specialist apps

### SoloBid

SoloBid remains a Convert + Collect specialist system.

DTC may create Today actions from SoloBid data, but it must not replace SoloBid&apos;s quote/deal workflow.

### RentEase

RentEase remains a property/landlord operations system.

DTC may create Today actions from rent, maintenance or admin issues, but it must not turn RentEase into a generic DueToday app.

### RadFlow

RadFlow remains a clinical workflow visibility system.

DTC may create operational actions, but RadFlow&apos;s privacy, clinical workflow and role rules always win.

## Current DTC pages

| Page | Role | Boundary |
| --- | --- | --- |
| `/app` | Today queue | Primary workspace |
| `/app/pipeline` | overview | Support, not primary |
| `/app/leads` | source/deep-work surface | Feeds Today |
| `/app/quotes` | source/deep-work surface | DueToday Collect module |
| `/app/invoices` | source/deep-work surface | DueToday Collect module |
| `/app/import` | capture automation | Feeds records, then Today |
| `/app/brief` | owner rhythm | Summary, not work surface |
| `/app/admin` | soft-launch learning | Founder only |
| `/app/settings` | configuration | Support only |

## Navigation boundary

The nav should communicate product priority:

```text
Today
Pipeline
Leads
Quotes
Invoices
Customers
Import
Brief
Settings
```

Import and Brief must not sit before Today/records because that visually turns DTC into an automation tool.

## Feature parking lot

Do not build until tester evidence proves need:

- bulk CRM import mapping
- scheduled customer WhatsApp sends
- payment gateway integration
- AI follow-up campaigns
- full accounting sync
- team assignment/work management
- cross-app write-back

## Next-build filter

Before adding anything, ask:

1. Does it strengthen assessment → diagnosis → Today action?
2. Does it preserve owner judgement?
3. Is this Core, Leads, Collect, Docs or a specialist app concern?
4. Is this a record feature pretending to be an action feature?
5. Did testers ask for this in the context of clearing Today?

If not, pause.
