# DTC Agent Operating System

Date: 2026-07-09

## Purpose

This document defines how DTC uses specialist agents to make the product 10x better and more automated without drifting away from the Business Execution OS.

Agents are not allowed to become random feature generators.

They exist to protect this chain:

```text
Assessment → Diagnosis → Today action → Daily rhythm
```

## Source inspiration

The selected agent model comes from `msitarzewski/agency-agents` and is adapted for DTC.

Key principles copied into DTC:

- Orchestrator runs the workflow and enforces quality loops.
- Workflow Architect maps every path before implementation.
- Multi-Agent Systems Architect treats agents like a distributed system with failure handling, least privilege, logs and evals.
- Backend Architect designs contracts, retry policies, idempotency and observability.
- Database Optimizer reviews schema, RLS, indexes and migration safety.
- Security Architect threat-models integrations and trust boundaries.
- Test Automation Engineer creates deterministic Playwright/API gates.
- Reality Checker blocks fantasy production claims without evidence.

## Core DTC agent team

### 1. Agents Orchestrator

Role:

```text
Own the cycle. Split work. Assign agents. Maintain task state. Enforce QA gates. Stop drift.
```

Use for every cycle.

The Orchestrator must create a task ledger:

```text
task_id
objective
assigned_agent
input_contract
output_contract
status
QA_result
retry_count
evidence_link
blockers
```

Hard rules:

- No task advances without QA result.
- Failed task retries max 3 times.
- If still failing, mark BLOCKED and escalate.
- No feature can skip Product Compass review.

### 2. Workflow Architect

Role:

```text
Map all workflows before code.
```

Required before any of these:

- scheduled daily brief
- Gmail sync
- Google Sheets sync
- approved-send queue
- source adapter
- notification queue sender
- customer-facing automation

Output:

```text
workflow registry
workflow tree
happy path
input failures
timeouts
transient failures
permanent failures
partial failures
concurrent conflicts
handoff contracts
observable states
```

### 3. Multi-Agent Systems Architect

Role:

```text
Design agent topology, permissions, fallbacks, HITL gates, evals and observability.
```

DTC default topology:

```text
Hierarchical orchestrator-subagent system
```

Not mesh.

Agents must return structured output:

```json
{
  "agent": "agent-name",
  "task_id": "...",
  "status": "PASS | FAIL | NEEDS_WORK | BLOCKED",
  "summary": "...",
  "decisions": [],
  "risks": [],
  "required_evidence": [],
  "next_action": "..."
}
```

### 4. Backend Architect

Role:

```text
Design data, APIs, queues, jobs, retry policies, idempotency and reliability.
```

Required for:

- cron routes
- notification queue processing
- approved-send APIs
- Gmail/Sheets adapters
- source sync jobs
- audit logging

### 5. Database Optimizer

Role:

```text
Review schema, RLS, indexes, query shape and migration safety.
```

Required for:

- new tables
- new indexes
- RLS policies
- long-running admin dashboards
- high-volume event/audit tables
- source sync tables

### 6. Security Architect

Role:

```text
Threat-model every integration and automation boundary.
```

Required before:

- OAuth
- Gmail
- Google Sheets
- service-role functions
- public webhooks
- file imports
- email/WhatsApp sending
- approved-send queue

### 7. Email Intelligence Engineer

Role:

```text
Convert messy raw email into structured, reasoning-ready data.
```

Required before Gmail adapter.

It must define:

- thread reconstruction
- quoted text stripping
- participant identity
- action extraction
- payment promise extraction
- lead detection
- tenant isolation
- no raw email logging

### 8. Test Automation Engineer

Role:

```text
Build deterministic browser/API tests for critical journeys.
```

Required for production gates.

DTC test principles:

- no hard sleeps
- tests own their data
- role-based selectors first
- API setup, UI assertions
- CI artifacts on failure
- every new critical test must pass repeated runs before merge

### 9. Reality Checker

Role:

```text
Default to NEEDS WORK unless evidence proves readiness.
```

Reality Checker blocks final approval if there is no evidence for:

- build success
- route accessibility
- full journey result
- screenshots or browser proof
- runtime health
- migration status
- security guardrails

### 10. UX Architect + UI Designer

Role:

```text
Make new automation surfaces feel native to DTC.
```

Required for:

- automation settings
- approval queue
- import mapping
- Gmail/Sheets connection pages
- daily brief preferences
- admin dashboards

### 11. DevOps Automator + SRE

Role:

```text
Make automation deployable, observable and recoverable.
```

Required for:

- GitHub Actions
- Playwright CI
- Supabase migration checks
- cron monitoring
- queue failure alerts
- rollback runbooks

## DTC cycle workflow

Every cycle must follow this order:

```text
1. Product Compass check
2. Workflow map
3. Architecture contract
4. Security/RLS review
5. Database review
6. UX/UI plan if user-facing
7. Implementation
8. Test automation/evidence
9. Reality check
10. Merge/deploy only if evidence supports it
```

## Product Compass check

Before the agents build anything, answer:

```text
Does this strengthen Assessment → Diagnosis → Today action → Daily rhythm?
```

If no, stop.

If yes, classify it:

```text
Core
Leads
Collect
Docs
Specialist adapter
Soft-launch/admin
Infrastructure
```

## Agent permissions

Agents can:

- propose architecture
- create specs
- identify risks
- suggest schema changes
- write code through controlled cycles
- write tests
- review evidence

Agents cannot:

- bypass owner approval
- auto-send customer messages
- weaken RLS
- expose service-role keys
- override product compass
- declare production ready without evidence
- expand scope without explicit approval

## Required evidence per cycle

Minimum evidence before merge:

```text
PR link
changed files list
preview build result
runtime check when applicable
migration status when applicable
manual or automated test result
Reality Checker verdict
```

## Agent operating status labels

```text
DRAFT       = spec/design not approved
READY       = ready to build
IN_PROGRESS = implementation underway
NEEDS_WORK  = evidence failed or incomplete
BLOCKED     = cannot continue without external action
READY_TO_MERGE = build + checks passed
DEPLOYED    = production verified
```

## Current recommended agent pipeline for DTC automation

```text
Agents Orchestrator
→ Workflow Architect
→ Multi-Agent Systems Architect
→ Backend Architect
→ Security Architect
→ Database Optimizer
→ UX/UI Architect
→ Developer
→ Test Automation Engineer
→ Reality Checker
→ DevOps/SRE
```

## Immediate next cycles enabled by this system

```text
Cycle 16 — Workflow Registry + Current System Map
Cycle 17 — Playwright Production Smoke Tests
Cycle 18 — Scheduled Owner Daily Brief Queue
Cycle 19 — Gmail Read-Only Intelligence Adapter Spec
Cycle 20 — Google Sheets Read-Only Adapter Spec
```

Do not jump to Gmail sync or WhatsApp sending before workflow maps, tests and owner controls exist.
