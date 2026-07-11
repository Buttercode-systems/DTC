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
const responseSchema = read('supabase/migrations/0023_client_service_report_responses.sql');
const serviceDeskRead = read('supabase/migrations/0024_client_service_desk_read.sql');
const serviceDecisions = read('supabase/migrations/0025_client_service_decisions.sql');
const workflowPage = read('app/ops/client/[businessId]/page.tsx');
const workflowActions = read('app/ops/workflow-actions.ts');
const workflowIndex = read('app/ops/workflows/page.tsx');
const serviceDeskPage = read('app/app/service/page.tsx');
const serviceDeskActions = read('app/app/service/actions.ts');
const nav = read('components/NavLinks.tsx');

for (const table of ['service_workflow_templates', 'service_work_items', 'service_work_item_events']) {
  assert.ok(schema.includes(`public.${table}`), `${table} schema must exist`);
  assert.ok(schema.includes(`alter table public.${table} enable row level security`), `${table} must retain RLS`);
}

const expectedTemplates = [
  ['invoice-admin-v1', 'invoice'], ['sales-admin-v1', 'sales'],
  ['client-admin-v1', 'client'], ['property-admin-v1', 'property'],
  ['practice-admin-v1', 'practice'], ['member-admin-v1', 'member'],
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
assert.ok(workflowIndex.includes('Managed client workflows') || workflowIndex.includes('Configurable service workflows'), 'operator console must include a workflow portfolio');

assert.ok(responseSchema.includes("('continue', 'change', 'stop')"), 'report response schema must constrain the client decision');
assert.ok(responseSchema.includes('client_responded_by'), 'report decisions must preserve the responding user');
assert.ok(serviceDeskRead.includes('function public.get_client_service_desk'), 'Service Desk read function must exist');
assert.ok(serviceDeskRead.includes('public.can_access_business'), 'Service Desk reads must remain business scoped');
assert.ok(serviceDeskRead.includes('revoke all on function public.get_client_service_desk'), 'Service Desk read must revoke broad execution');

for (const fn of ['decide_client_service_approval', 'respond_to_service_report']) {
  assert.ok(serviceDecisions.includes(`function public.${fn}`), `${fn} must exist`);
  assert.ok(serviceDecisions.includes(`revoke all on function public.${fn}`), `${fn} must revoke broad execution`);
}
assert.ok(serviceDecisions.includes('public.can_manage_business'), 'client decisions must require manager access');

for (const surface of ['Your Service Desk', 'Approvals waiting', 'Workflow visibility', 'Service reports', 'Continue', 'Change the workflow', 'Stop']) {
  assert.ok(serviceDeskPage.includes(surface), `Service Desk must expose ${surface}`);
}
assert.ok(serviceDeskPage.includes('sync_service_workflow_actions'), 'Service Desk must refresh managed workflow actions');
assert.ok(serviceDeskActions.includes('decide_client_service_approval'), 'client approval action must use the scoped RPC');
assert.ok(serviceDeskActions.includes('respond_to_service_report'), 'client report response must use the scoped RPC');
assert.ok(nav.includes('/app/service'), 'client navigation must expose the Service Desk');

console.log('Configurable service workflow and client Service Desk contract passed.');
