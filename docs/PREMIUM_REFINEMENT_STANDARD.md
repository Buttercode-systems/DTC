# DueToday premium refinement standard

## Product promise

Find what is stuck. Know what to do next. Keep the business moving.

This standard improves the existing product without adding new feature categories. A refinement is acceptable only when it makes an existing workflow clearer, safer, faster or more trustworthy.

## Core quality rules

1. Today must show only actionable work with a visible reason and next step.
2. Leads, quotes, invoices, pipeline and reports must use consistent outcome language.
3. Failed data queries must never render as believable zero-data states.
4. Empty states must explain what the absence means and the safest next action.
5. Forms must identify the real-world record being captured and the commitment that follows.
6. Completion language must describe an outcome, not merely a database mutation.
7. Money, dates, statuses and workspace identity must remain consistent across screens.
8. Mobile layouts must preserve the primary action and avoid horizontal overflow.
9. Guidance must remain optional, non-blocking and DueToday-only.
10. No refinement may alter TAD SaaS, Managed, Hybrid, portal or operator behaviour.

## Existing workflow contract

### Today

- explains why each action is due;
- keeps the next commitment visible after an outcome;
- distinguishes lead, quote, invoice and recurring commitments;
- treats a clear queue as success, not an error.

### Leads

- captures real enquiries from existing channels;
- keeps unanswered enquiries visible on Today;
- records a meaningful outcome.

### Quotes

- shows open quotes awaiting a decision;
- makes follow-up history and age understandable;
- closes records only through an explicit won or lost outcome.

### Invoices

- separates overdue, current, supplier and settled records;
- makes due dates and payment state explicit;
- preserves promise-to-pay and next-date behaviour.

### Pipeline

- presents the existing lead-to-payment journey as one connected flow;
- never converts query failure into zero counts;
- directs the user back to Today for action.

### Report

- explains what moved, what remains exposed and what requires attention;
- does not claim outcomes that the recorded evidence cannot prove.

## Release gate

Every refinement must pass typecheck, lint, production build, DueToday contracts, TAD Portal verification, TAD dual-mode integration, full operator/client regression and browser journeys. The page-performance evidence may remain a diagnostic gate where the documented 50 ms target is not yet met; it must not be hidden or weakened.
