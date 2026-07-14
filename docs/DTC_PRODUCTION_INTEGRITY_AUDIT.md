# DTC production integrity audit

Date: 2026-07-14

## Executive finding

PR 25 correctly added the TAD SaaS and TAD Managed foundation, but it also crossed the product boundary and changed ordinary DueToday workspaces into TAD workspaces.

The most serious regressions were:

1. `requireBusiness()` automatically activated all six TAD departments for every newly provisioned business.
2. Ordinary DueToday signup promised that all six TAD departments would be activated and redirected users to `/app/departments`.
3. `/app` stopped running the DueToday action engine and displayed only the TAD unified department queue.
4. The standalone DueToday navigation was replaced by TAD Departments, Approvals, Reports, Team and Account navigation.
5. Direct TAD department and team mutations did not verify that the active workspace was a TAD workspace.

These were product regressions even when the application compiled and TAD tests passed.

## Product boundary

DTC contains two platforms that share infrastructure but are not the same product.

### DueToday

Promise: find what is stuck, know what to do next and keep the business moving.

Core path:

`assessment -> workspace -> leads/quotes/invoices -> derived Today actions -> recorded outcome -> next commitment`

Required surfaces:

- Today action engine
- Leads
- Quotes
- Invoices
- Customers
- Pipeline
- Report
- Import
- Settings

### TAD

Promise: one back-office operating platform containing six connected admin departments, available as TAD SaaS, TAD Managed or Hybrid.

Core path:

`TAD signup or managed activation -> six departments -> unified Today queue -> approvals -> reports -> team`

Required surfaces:

- Departments
- Unified Today queue
- Approvals and service reports
- Team and invitations
- Imports
- TAD account and delivery mode

## Changes made in this branch

- Added an explicit `businesses.platform_key` discriminator: `duetoday` or `tad`.
- Defaulted new businesses to `duetoday`.
- Backfilled only unambiguous managed TAD businesses to `tad`.
- Removed automatic TAD department activation from generic business provisioning.
- Added explicit `?product=tad` TAD SaaS signup while restoring ordinary DueToday signup.
- Restored the DueToday Today engine and retained the TAD unified Today queue behind the platform boundary.
- Restored DueToday navigation and retained separate TAD SaaS and TAD Managed navigation.
- Added route and server-action guards for TAD Departments and Team.
- Added a permanent platform-boundary regression test to `npm run verify`.

## Existing production data review required

The migration intentionally does not guess which existing self-service businesses are genuine TAD SaaS workspaces. PR 25 activated TAD departments for ordinary DueToday signups, so the existence of department engagements or a starter subscription is not reliable evidence.

Before production rollout, review every non-managed business that currently has TAD engagements and classify it explicitly:

- genuine DueToday customer -> `platform_key = 'duetoday'`
- genuine TAD SaaS customer -> `platform_key = 'tad'`

Managed businesses are safely classified as TAD automatically.

## Promise verification matrix

| Promise | Product | Code gate | Live gate before release |
|---|---|---|---|
| New DueToday user receives a DueToday workspace, not six TAD departments | DueToday | Platform boundary contract | Create fresh account and confirm no TAD engagements are created |
| Today derives lead, quote and invoice actions | DueToday | Existing phase/service tests plus restored engine path | Seed lead, quote and invoice; verify due actions and completion transaction |
| Leads, quotes, invoices, customers and pipeline remain reachable | DueToday | Navigation contract and production build | Mobile and desktop browser journey |
| TAD SaaS activates all six departments | TAD | Existing dual-mode contract | Create `product=tad` account and verify six department centres |
| TAD Managed client activation remains verified-email only | TAD | Existing client-access contract | Managed activation browser journey |
| TAD unified Today shows due, overdue, blocked and approvals | TAD | Existing integration contract | Seed records in multiple departments and inspect queue |
| DueToday cannot mutate TAD departments accidentally | Both | Platform action guards | Attempt direct department URL/action from DueToday workspace |
| Workspace switching preserves the correct product shell | Both | Product-aware layout and navigation | Switch between one DueToday and one TAD business |
| Data remains isolated by business and role | Both | Existing RLS/integration tests | Owner, viewer and outsider production-like test |
| Weekly reports and approvals remain real | TAD | Existing service workflow tests | Create approval, resolve it and produce weekly report |

## Release gate

Do not merge or deploy until all of the following pass:

1. `npm run verify`
2. production build
3. existing full operator and client browser regression
4. a new dual-product browser journey with one DueToday workspace and one TAD workspace
5. production data classification review
6. Supabase migration 0032 applied
7. post-deploy smoke test on DueToday signup, TAD SaaS signup and TAD Managed activation
