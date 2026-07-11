import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const schema = read('supabase/migrations/0016_service_workflow_schema.sql');
const templates = read('supabase/migrations/0017_service_workflow_templates.sql');
const readCreate = read('supabase/migrations/0018_service_workflow_read_create.sql');
const update = read('supabase/migrations/0019_service_workflow_update.sql');
const sync = read('supabase/migrations/0020_service_workflow_action_sync.sql');
const outcome = read('supabase/migrations/0021_service_workflow_outcome_trigger.sql');
const reporting = read('supabase/migrations/0022_service_workflow_reporting.sql');
const serviceDeskMigration = read('supabase/migrations/0023_client_service_desk.sql');
const approvalActionMigration = read('supabase/migrations/0024_service_approval_today_actions.sql');
const workflowPage = read('app/ops/client/[businessId]/page.tsx');
const workflowActions = read('app/ops/workflow-actions.ts');
const workflowIndex = read('app/ops/workflows/page.tsx');
const serviceDeskPage = read('app/app/service/page.tsx');
const serviceDeskActions = read('app/app/service/actions.ts');
const approvalSection = read('components/service-desk/ApprovalSection.tsx');
const reportSection = read('components/service-desk/ReportSection.tsx');
const todayList = read('components/TodayList.tsx');
const opsPage = read('app/ops/page.tsx');
const nav = read('components/NavLinks.tsx');

for (const table of [
  'service_workflow_templates',
  'service_work_items',
  'service_work_item_events'
]) {
  assert.ok(schema.includes(`public.${table}`), `${table} schema must exist`);
  assert.ok(schema.includes(`alter table public.${table} enable row level security`), `${table} must retain RLS`);
}

const expectedTemplates = [
  ['invoice-admin-v1', 'invoice'],
  ['sales-admin-v1', 'sales'],
  ['client-admin-v1', 'client'],
  ['property-admin-v1', 'property'],
  ['practice-admin-v1', 'practice'],
  ['member-admin-v1', 'member'],
  ['core-admin-v1', 'core']
];
for (const [key, department] of expectedTemplates) {
  assert.ok(templates.includes(`'${key}','${department}'`), `${key} must be seeded`);
}
assert.ok(templates.includes("'data_warning'"), 'practice template must carry its protected-data warning');

for (const fn of ['get_service_workflow', 'create_service_work_item']) {
  assert.ok(readCreate.includes(`function public.${fn}`), `${fn} must exist`);
  assert.ok(readCreate.includes(`revoke all on function public.${fn}`), `${fn} must revoke broad execution`);
}
assert.ok(update.includes('function public.update_service_work_item'), 'record update function must exist');
assert.ok(update.includes("'status_changed'"), 'record updates must preserve status history');
assert.ok(sync.includes("'service_workflow'"), 'workflow records must produce DueToday actions');
assert.ok(sync.includes("pending.kind='manual_followup'"), 'workflow sync must defer to open dated follow-ups');
assert.ok(sync.includes("wt.config->'closed_statuses'"), 'closed workflow states must retire actions');
assert.ok(outcome.includes('reflect_service_workflow_outcome'), 'action outcomes must reflect into workflow records');
assert.ok(reporting.includes("'workflow_completed'"), 'weekly reports must include workflow completion');
assert.ok(reporting.includes("'workflow_blocked'"), 'weekly reports must include blocked workflow records');

for (const contract of ['createWorkflowItem', 'updateWorkflowItem', 'sync_service_workflow_actions']) {
  assert.ok(workflowActions.includes(contract), `workflow server actions must include ${contract}`);
}
for (const control of ['Assigned person', 'Next action due', 'Blocked reason', 'Update record', 'Workflow map']) {
  assert.ok(workflowPage.includes(control), `workflow UI must expose ${control}`);
}
assert.ok(workflowPage.includes('data_warning'), 'workflow UI must display template data warnings');
assert.ok(workflowIndex.includes('Configurable service workflows'), 'operator console must include a workflow portfolio');

for (const fn of [
  'decide_client_service_approval',
  'respond_to_service_report',
  'get_tad_client_responses'
]) {
  assert.ok(serviceDeskMigration.includes(`function public.${fn}`), `${fn} must exist`);
  assert.ok(serviceDeskMigration.includes(`revoke all on function public.${fn}`), `${fn} must revoke broad execution`);
}
assert.ok(serviceDeskMigration.includes('public.can_manage_business'), 'client decisions must require manager access');
assert.ok(serviceDeskMigration.includes("('continue', 'change', 'stop')"), 'weekly reports must capture continue/change/stop');
assert.equal(serviceDeskMigration.includes('get_client_service_desk'), false, 'Service Desk must reuse established workflow and RLS reads');

for (const contract of [
  'sync_service_approval_action',
  'guard_client_approval_action_completion',
  "'client_approval'",
  "'service_approval:'"
]) {
  assert.ok(approvalActionMigration.includes(contract), `approval action loop must include ${contract}`);
}
assert.ok(approvalActionMigration.includes('approval must be decided in the Service Desk'), 'generic completion must not bypass approval');

for (const surface of ['Your Service Desk', 'Today actions', 'Open today’s actions']) {
  assert.ok(serviceDeskPage.includes(surface), `Service Desk must expose ${surface}`);
}
for (const readContract of [
  'get_service_workflow',
  'service_approvals',
  'service_reports',
  'can_manage_business',
  "new Set(payload?.template.config.closed_statuses"
]) {
  assert.ok(serviceDeskPage.includes(readContract), `Service Desk must reuse ${readContract}`);
}
for (const surface of ['Approvals waiting', 'Owner or manager decision required']) {
  assert.ok(approvalSection.includes(surface), `approval surface must expose ${surface}`);
}
for (const surface of ['Service reports', 'Continue', 'Change the workflow', 'Stop']) {
  assert.ok(reportSection.includes(surface), `report surface must expose ${surface}`);
}
assert.ok(serviceDeskActions.includes('decide_client_service_approval'), 'client approval action must use the scoped RPC');
assert.ok(serviceDeskActions.includes('respond_to_service_report'), 'client report response must use the scoped RPC');
assert.ok(todayList.includes('Review decision →'), 'Today must route approval tasks to the Service Desk');
assert.ok(todayList.includes('client_approval'), 'Today must identify protected approval actions');
assert.ok(opsPage.includes('get_tad_client_responses'), 'operator console must load client review decisions');
assert.ok(opsPage.includes('action.kind === "client_approval"'), 'operators must not complete approvals as generic outcomes');
assert.ok(nav.includes('/app/service'), 'client navigation must expose the Service Desk');

console.log('Configurable service workflow and client Service Desk contract passed.');
