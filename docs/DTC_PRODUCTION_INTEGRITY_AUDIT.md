# DTC production integrity audit

Date: 2026-07-14

## Executive finding

PR 25 correctly added the TAD SaaS and TAD Managed foundation, but it also crossed the product boundary and changed ordinary DueToday workspaces into TAD workspaces.

The most serious regressions were:

1. `requireBusiness()` automatically activated all six TAD departments for every newly provisioned business.
2. Ordinary DueToday signup promised that all six TAD departments would be activated and redirected users to `/app/departments`.
3. `/app` stopped running the DueToday action engine and displayed only the TAD unified department queue.
4. The standalone DueToday navigation was replaced by TAD Departments, Approvals, Reports, Team and Account navigation.
5. Direct TAD department, team and import mutations did not verify that the active workspace was a TAD workspace.
6. The DueToday quote/invoice import workbench was replaced by the TAD department importer.

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
- Quote and invoice import
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
- All-department imports
- TAD account and delivery mode

## Changes made in this branch

- Added an explicit `businesses.platform_key` discriminator: `duetoday` or `tad`.
- Defaulted new businesses to `duetoday`.
- Backfilled only unambiguous managed TAD businesses to `tad`.
- Removed automatic TAD department activation from generic business provisioning.
- Added explicit `?product=tad` TAD SaaS signup while restoring ordinary DueToday signup.
- Restored the DueToday Today engine and retained the TAD unified Today queue behind the platform boundary.
- Restored DueToday navigation and retained separate TAD SaaS and TAD Managed navigation.
- Restored DueToday quote/invoice import while retaining TAD department imports.
- Added route and server-action guards for TAD Departments, Team, Service, Account and department imports.
- Added permanent code and database integration coverage for the product boundary.
- Removed the temporary TAD diagnostics workflow.

## Production data classification review

The production database was inspected before rollout.

Current state:

- 2 businesses total
- 1 non-managed business with no TAD engagements and no TAD subscription
- 1 managed TAD pilot business with one TAD engagement
- no self-service business has TAD engagements
- no business currently has a TAD workspace subscription

This makes the migration classification safe:

- the non-managed business remains `duetoday`
- the managed pilot is backfilled to `tad`

There is no current production record requiring a manual self-service TAD classification.

## Promise verification matrix

| Promise | Product | Code gate | Live gate before release |
|---|---|---|---|
| New DueToday user receives a DueToday workspace, not six TAD departments | DueToday | Platform boundary contract and isolated Supabase integration | Create fresh account and confirm no TAD engagements are created |
| Today derives lead, quote and invoice actions | DueToday | Existing phase/service tests plus restored engine path | Seed lead, quote and invoice; verify due actions and completion transaction |
| Leads, quotes, invoices, customers and pipeline remain reachable | DueToday | Navigation contract and production build | Mobile and desktop browser journey |
| DueToday quote and invoice import remains available | DueToday | Product-aware import contract and production build | Import sample quotes and invoices; verify Today actions |
| TAD SaaS activates all six departments | TAD | Dual-mode contract and isolated Supabase integration | Create `product=tad` account and verify six department centres |
| TAD Managed client activation remains verified-email only | TAD | Client-access contract | Managed activation browser journey |
| TAD unified Today shows due, overdue, blocked and approvals | TAD | Isolated Supabase integration | Seed records in multiple departments and inspect queue |
| DueToday cannot mutate TAD departments accidentally | Both | Route and server-action guards | Attempt direct department URL/action from DueToday workspace |
| Workspace switching preserves the correct product shell | Both | Product-aware layout and navigation | Switch between one DueToday and one TAD business |
| Data remains isolated by business and role | Both | Existing RLS/integration tests | Owner, viewer and outsider production-like test |
| Weekly reports and approvals remain real | TAD | Existing service workflow tests | Create approval, resolve it and produce weekly report |

## Release gate

Do not merge or deploy until all of the following pass:

1. `npm run verify`
2. production build
3. existing full operator and client browser regression
4. isolated dual-product database integration
5. production data classification review
6. Supabase migration 0032 applied
7. post-deploy smoke test on DueToday signup, TAD SaaS signup and TAD Managed activation
