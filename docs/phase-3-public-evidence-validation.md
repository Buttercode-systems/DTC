# Phase 3 — Public-Evidence Workflow Validation

Date: 2026-07-11

## What this validates

This phase uses real South African businesses as public workflow anchors. It tests whether DueToday can represent different operating models, preserve evidence-backed strengths, surface conservative uncertainty and generate a sensible first action list.

It is **not** customer validation. No business was contacted, no form was submitted, no private system was accessed and no business confirmed the fixture answers or scores.

Each fixture separates:

- verified public workflow evidence;
- explicit conservative assumptions used to complete the 35-question assessment;
- internal information that remains unknown.

Unknown internal controls are never presented as verified failure.

## Real-business anchors

### Stuttaford Van Lines

Public evidence:

- quote capture includes departure, destination and move date;
- a pre-move survey precedes the estimate;
- one move coordinator follows the quotation and booking;
- one point of contact, inventory records and move reporting are described;
- supplier controls include service expectations and review processes.

Sources:

- https://www.stuttafordvanlines.co.za/free-quote/
- https://www.stuttafordvanlines.co.za/national-move/
- https://www.stuttafordvanlines.co.za/services/move-management/
- https://www.stuttafordvanlines.co.za/about-us/supply-chain-management/

Unknown: actual collections routines, real response times and day-to-day adherence.

### Rentokil South Africa

Public evidence:

- structured enquiry and survey workflow;
- written risk assessments and service plans;
- recurring service programmes;
- treatment records, audit-ready documentation, account ownership and online reporting.

Source: https://www.rentokil.co.za/

Unknown: actual debtor performance and internal staff adherence.

### Trafalgar Property Management

Public evidence:

- property-management and finance workflows;
- online services, property portal and reporting;
- multiple service categories and offices.

Source: https://www.trafalgar.co.za/

Unknown: actual request ageing, approval time and internal exception queues.

### Zone Fitness

Public evidence:

- online joining, multiple branches and timetables;
- defined membership products;
- debit-order, continuation and written-cancellation rules.

Sources:

- https://zonefitness.co.za/
- https://zonefitness.co.za/faq/

Unknown: actual member-risk follow-up, management reporting and owner visibility.

### Sorbet

Public evidence:

- online booking by treatment, time and staff member;
- booking reminders, loyalty and service-recovery workflows.

Source: https://www.sorbet.co.za/

Unknown: internal daily priorities, collections and management reporting.

## Automated assertions

The Phase 3 suite compiles and executes the real DueToday scoring engine. It asserts that:

- all five fixtures produce bounded scores across all seven business jobs;
- every fixture produces starter actions;
- Stuttaford-like delivery, control and leadership evidence remains Moving;
- Rentokil-like delivery and documentation remain Moving;
- Trafalgar-like control and visibility remain Moving;
- Zone-like conversion and leadership uncertainty surfaces as a bottleneck;
- Sorbet-like acquisition and delivery evidence remains Moving.

Run with:

```bash
npm run test:phase3
```

## Product changes caused by the validation

- Assessment instructions now require answers based on actual recent work, not policy or intention.
- Unknowns must be answered conservatively and checked later.
- The unimplemented promise that a report link would be emailed was removed.
- The report now includes a four-part evidence-validation checklist.
- The report states that it reflects supplied answers and is not an independent audit.

## Remaining Phase 3 gate

Public evidence can validate workflow coverage and scoring behaviour. It cannot prove adoption, recurring use, time saved or willingness to pay. Those outcomes still require consenting pilot businesses using their own protected records.
