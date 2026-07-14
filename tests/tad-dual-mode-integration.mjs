import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.API_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && anonKey && serviceKey, 'Local Supabase URL, anon key and service-role key are required');

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const password = 'Tad-Dual-Mode-2026!';
const stamp = Date.now();
const dueTodayEmail = `duetoday-${stamp}@tad.test`;
const ownerEmail = `owner-${stamp}@tad.test`;
const viewerEmail = `viewer-${stamp}@tad.test`;
const outsiderEmail = `outsider-${stamp}@tad.test`;

async function createUser(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { business_name: 'Dual Mode Test' } });
  assert.ifError(error);
  return data.user;
}

async function signIn(email) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  assert.ok(data.session);
  return client;
}

async function rpc(client, fn, args = {}) {
  const { data, error } = await client.rpc(fn, args);
  assert.ifError(error);
  return data;
}

async function rpcFails(client, fn, args, pattern) {
  const { error } = await client.rpc(fn, args);
  assert.ok(error, `${fn} should fail`);
  assert.match(error.message, pattern);
}

await createUser(dueTodayEmail);
const ownerUser = await createUser(ownerEmail);
await createUser(viewerEmail);
await createUser(outsiderEmail);
const dueToday = await signIn(dueTodayEmail);
const owner = await signIn(ownerEmail);
const viewer = await signIn(viewerEmail);
const outsider = await signIn(outsiderEmail);

// Generic provisioning must remain DueToday and must not silently create TAD state.
await rpc(dueToday, 'provision_my_business', { p_business_name: 'DueToday Boundary Test', p_assessment_token: null });
const dueTodayBusinesses = await rpc(dueToday, 'list_accessible_businesses');
assert.equal(dueTodayBusinesses.length, 1);
const dueTodayBusinessId = dueTodayBusinesses[0].id;
assert.equal(dueTodayBusinesses[0].platform_key, 'duetoday');
const { count: dueTodayEngagements, error: dueTodayEngagementError } = await dueToday
  .from('service_engagements')
  .select('id', { count: 'exact', head: true })
  .eq('business_id', dueTodayBusinessId);
assert.ifError(dueTodayEngagementError);
assert.equal(dueTodayEngagements, 0);
const { count: dueTodaySubscriptions, error: dueTodaySubscriptionError } = await dueToday
  .from('workspace_subscriptions')
  .select('id', { count: 'exact', head: true })
  .eq('business_id', dueTodayBusinessId);
assert.ifError(dueTodaySubscriptionError);
assert.equal(dueTodaySubscriptions, 0);

// TAD SaaS is an explicit product choice, followed by six-department activation.
await rpc(owner, 'provision_my_business', { p_business_name: 'Dual Mode Test', p_assessment_token: null });
const ownerBusinesses = await rpc(owner, 'list_accessible_businesses');
assert.equal(ownerBusinesses.length, 1);
const businessId = ownerBusinesses[0].id;
assert.equal(await rpc(owner, 'set_business_platform', { p_business_id: businessId, p_platform_key: 'tad' }), 'tad');

const activation = await rpc(owner, 'activate_all_tad_departments', { p_business_id: businessId, p_delivery_mode: 'self_service' });
assert.equal(activation.departments.length, 6);
const center = await rpc(owner, 'get_tad_department_center', { p_business_id: businessId });
assert.equal(center.departments.length, 6);
assert.equal(center.departments.filter((item) => item.active).length, 6);
assert.equal(center.departments.every((item) => item.delivery_mode === 'self_service'), true);
assert.equal(center.subscription.plan_key, 'starter');
assert.equal(center.subscription.status, 'trialing');

await rpc(owner, 'set_tad_department_mode', {
  p_business_id: businessId,
  p_department: 'invoice',
  p_delivery_mode: 'managed',
  p_enabled: true,
});
const hybridCenter = await rpc(owner, 'get_tad_department_center', { p_business_id: businessId });
assert.equal(hybridCenter.business.delivery_mode, 'hybrid');
assert.equal(hybridCenter.departments.find((item) => item.department === 'invoice').delivery_mode, 'managed');

const sales = hybridCenter.departments.find((item) => item.department === 'sales');
const invoice = hybridCenter.departments.find((item) => item.department === 'invoice');
assert.ok(sales.engagement_id && invoice.engagement_id);

await rpc(owner, 'create_service_work_item', {
  p_business_id: businessId,
  p_engagement_id: sales.engagement_id,
  p_reference: 'SALES-E2E-001',
  p_title: 'Follow up accepted quote',
  p_status: null,
  p_assigned_name: 'Owner',
  p_priority: 80,
  p_next_action: 'Confirm installation date',
  p_due_date: new Date().toISOString().slice(0, 10),
  p_blocked_reason: null,
  p_data: {},
});
await rpc(owner, 'create_service_work_item', {
  p_business_id: businessId,
  p_engagement_id: invoice.engagement_id,
  p_reference: 'INV-E2E-001',
  p_title: 'Resolve supplier invoice exception',
  p_status: null,
  p_assigned_name: 'TAD',
  p_priority: 90,
  p_next_action: 'Request missing purchase order',
  p_due_date: new Date().toISOString().slice(0, 10),
  p_blocked_reason: 'Purchase order missing',
  p_data: {},
});

const today = await rpc(owner, 'get_tad_unified_today', { p_business_id: businessId });
assert.equal(today.items.length, 2);
assert.deepEqual(new Set(today.items.map((item) => item.department)), new Set(['sales', 'invoice']));
assert.equal(today.summary.blocked, 1);

const importResult = await rpc(owner, 'import_tad_department_rows', {
  p_business_id: businessId,
  p_department: 'sales',
  p_filename: 'sales.csv',
  p_rows: [
    { reference: 'SALES-IMPORT-001', title: 'Imported sales follow-up', priority: '70', next_action: 'Call customer', due_date: new Date().toISOString().slice(0, 10), data: {} },
    { reference: 'SALES-E2E-001', title: 'Duplicate reference', priority: '50', data: {} },
  ],
});
assert.equal(importResult.imported, 1);
assert.equal(importResult.skipped, 1);

const invitation = await rpc(owner, 'create_workspace_invitation', { p_business_id: businessId, p_email: viewerEmail, p_role: 'viewer' });
assert.ok(invitation.token);
const accepted = await rpc(viewer, 'accept_workspace_invitation', { p_token: invitation.token });
assert.equal(accepted.business_id, businessId);
assert.equal(accepted.role, 'viewer');
const viewerBusinesses = await rpc(viewer, 'list_accessible_businesses');
assert.equal(viewerBusinesses.length, 1);
await rpcFails(viewer, 'set_tad_department_mode', {
  p_business_id: businessId,
  p_department: 'sales',
  p_delivery_mode: 'managed',
  p_enabled: true,
}, /manager access required/i);

const viewerToday = await rpc(viewer, 'get_tad_unified_today', { p_business_id: businessId });
assert.ok(viewerToday.items.length >= 3);
assert.deepEqual(await rpc(outsider, 'list_accessible_businesses'), []);
await rpcFails(outsider, 'get_tad_department_center', { p_business_id: businessId }, /business not accessible/i);

const team = await rpc(owner, 'get_workspace_team', { p_business_id: businessId });
assert.ok(team.members.some((member) => member.user_id === ownerUser.id));
assert.ok(team.members.some((member) => member.email === viewerEmail && member.role === 'viewer'));

const complete = await rpc(owner, 'complete_tad_onboarding', { p_business_id: businessId });
assert.equal(complete.onboarding_status, 'complete');
assert.equal(complete.active_departments, 6);

console.log(JSON.stringify({
  result: 'passed',
  dueTodaySeparated: true,
  allDepartments: 6,
  selfService: true,
  managed: true,
  hybrid: true,
  unifiedToday: true,
  import: true,
  invitations: true,
  viewerReadOnly: true,
  outsiderIsolated: true,
  onboardingComplete: true,
}));
