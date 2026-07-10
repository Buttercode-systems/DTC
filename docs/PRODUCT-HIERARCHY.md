# DueToday Product Hierarchy

Date: 2026-07-09

## Top-level system

```text
Business Execution OS
```

This is the larger product idea.

It helps a small business answer:

```text
What is stuck, who owns it, and what must happen today?
```

## Product layers

### 1. Business Execution Assessment

Purpose:

```text
Diagnose how work actually moves.
```

It measures seven jobs:

```text
Acquire
Convert
Deliver
Collect
Control
Improve
Lead
```

Across five dimensions:

```text
process
documented
accountable
measured
reviewed
```

The assessment must remain the front door because it prevents DTC from prescribing a quote/invoice solution to every business.

### 2. Momentum Report

Purpose:

```text
Show which parts of execution are moving, slowing, or stuck.
```

The report is analysis and history. It is not the daily workspace.

It should produce:

- score
- Momentum Map
- bottlenecks
- findings
- recommendations
- starter actions

### 3. DueToday Core

Purpose:

```text
Turn diagnosed stuck work into actions due today.
```

Core includes:

- action contract
- Today queue
- rule engine
- due/overdue logic
- action lifecycle
- owner rhythm

### 4. DueToday modules

Modules solve specific workflow bottlenecks.

They are not the whole product.

```text
DueToday Leads
  Acquire + response discipline

DueToday Collect
  Convert + Collect: quote follow-up, invoices, promises, payments

DueToday Docs
  Control: supplier/admin/document actions
```

### 5. Specialist apps

Specialist systems remain focused on their own domain.

```text
SoloBid
  Convert + Collect specialist system

RentEase
  Deliver + Control + Collect specialist system

RadFlow
  Deliver + Control + Lead specialist system
```

DTC should not absorb these products. It can recommend, integrate or route to them.

## Correct user flow

```text
Landing
→ Assessment
→ Momentum Report
→ Signup
→ Today
→ first action list
→ records/imports/adapters feed Today
→ module recommendation only when needed
```

## Incorrect user flow

```text
Landing
→ import quotes/invoices
→ chase customers
→ become mini CRM
```

That path may make sense for DueToday Collect, but not for the whole Business Execution OS.

## Current module placement

| Current DTC feature | Correct product layer |
| --- | --- |
| Assessment | Business Execution Assessment |
| Report | Momentum Report |
| Today list | DueToday Core |
| Leads | DueToday Leads / Core record feeder |
| Quotes | DueToday Collect record feeder |
| Invoices | DueToday Collect record feeder |
| Import | Capture automation for Leads/Collect/Core |
| Daily brief | DueToday Core owner rhythm |
| WhatsApp draft | Owner-approved action support |
| Feedback/admin | Soft-launch learning layer |

## Product rule

Every new feature must answer this before build:

```text
Which stuck business job does this help diagnose, action, or resolve?
```

If the answer is only:

```text
It helps us manage more records
```

then the feature is probably not core yet.
