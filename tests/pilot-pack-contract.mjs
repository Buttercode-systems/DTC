import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const files = {
  guide: read('docs/pilot/README.md'),
  consent: read('docs/pilot/01-client-selection-and-consent.md'),
  scorecard: read('docs/pilot/02-baseline-endline-scorecard.csv'),
  importTemplate: read('docs/pilot/03-sales-admin-import-template.csv'),
  dictionary: read('docs/pilot/04-sales-admin-data-dictionary.md'),
  operatorLog: read('docs/pilot/05-daily-operator-log.csv'),
  weeklyReview: read('docs/pilot/06-weekly-client-review.md'),
  closeout: read('docs/pilot/07-pilot-closeout.md'),
  offer: read('docs/pilot/08-sales-admin-service-offer.md'),
  proposal: read('docs/pilot/09-client-proposal-template.md'),
  onboarding: read('docs/pilot/10-client-onboarding-checklist.md'),
  routing: read('docs/pilot/11-audit-to-offer-routing.md'),
};

for (const [name, contents] of Object.entries(files)) {
  assert.ok(contents.trim().length > 0, `${name} must not be empty`);
}

for (const phrase of [
  '14-day',
  'Sales Admin / quote-follow-up workflow',
  'human approvals',
  'Do not add broad features during the pilot',
]) {
  assert.ok(files.guide.includes(phrase), `pilot guide must include ${phrase}`);
}

for (const phrase of [
  'Data authority confirmed in writing',
  'Do not import records before this gate is complete',
  'At least 10 real records loaded',
  'Continue/change/stop response recorded',
]) {
  assert.ok(files.onboarding.includes(phrase), `onboarding gate must include ${phrase}`);
}

for (const phrase of [
  'Admin Audit',
  'R1,500',
  'Sales Admin Setup',
  'R4,900',
  'Managed Follow-up',
  'R3,900 per month',
  'Launch price hypothesis',
]) {
  assert.ok(files.offer.includes(phrase), `offer must include ${phrase}`);
}

assert.ok(files.proposal.includes('R4,900'), 'proposal must match the setup price');
assert.ok(files.proposal.includes('R3,900/month'), 'proposal must match the monthly price');
assert.ok(files.routing.includes('R4,900'), 'audit routing must match the setup price');
assert.ok(files.routing.includes('R3,900/month'), 'audit routing must match the monthly price');

const importHeaders = files.importTemplate.trim().split(',');
for (const header of [
  'record_type',
  'external_reference',
  'customer_name',
  'current_status',
  'assigned_owner',
  'next_action',
  'next_action_due',
]) {
  assert.ok(importHeaders.includes(header), `import template must include ${header}`);
}

const scorecardHeaders = files.scorecard.split('\n')[0].split(',');
for (const header of ['metric', 'baseline_value', 'endline_value', 'source']) {
  assert.ok(scorecardHeaders.includes(header), `scorecard must include ${header}`);
}

const operatorHeaders = files.operatorLog.trim().split(',');
for (const header of [
  'actions_completed',
  'outcomes_recorded',
  'approvals_requested',
  'minutes_spent',
  'work_done_outside_duetoday',
  'exception_detail',
]) {
  assert.ok(operatorHeaders.includes(header), `operator log must include ${header}`);
}

for (const phrase of [
  'Would the client pay for the setup',
  'Monthly amount accepted',
  'Continue',
  'Change',
  'Stop',
]) {
  assert.ok(files.closeout.includes(phrase), `closeout must include ${phrase}`);
}

for (const phrase of [
  'This is a managed service, not a self-service CRM subscription',
  'TAD does not promise revenue',
  'automatic WhatsApp or email sending',
]) {
  assert.ok(files.offer.includes(phrase), `offer boundary must include ${phrase}`);
}

assert.ok(files.consent.includes('No records may be loaded until this section is complete.'), 'consent must gate record loading');
assert.ok(files.weeklyReview.includes('Every important decision must exist in the Service Desk approval queue.'), 'weekly review must protect approvals');
assert.ok(files.dictionary.includes('Duplicate references must be resolved before import.'), 'data dictionary must require deduplication');

console.log('Managed-service pilot launch pack contract passed.');
