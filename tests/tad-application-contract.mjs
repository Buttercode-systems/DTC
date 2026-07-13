import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const baseMigration = read("supabase/migrations/0024_tad_application_pipeline.sql");
const departmentMigration = read("supabase/migrations/0025_multi_department_tad_applications.sql");
const commercialMigration = read("supabase/migrations/0027_tad_commercial_gate_controls.sql");
const endpoint = read("app/api/tad/applications/route.ts");
const page = read("app/ops/applications/page.tsx");
const actions = read("app/ops/applications/actions.ts");
const layout = read("app/ops/layout.tsx");

for (const phrase of [
  "public.tad_applications",
  "public.tad_application_events",
  "submit_tad_application",
  "list_tad_applications",
  "update_tad_application",
  "start_tad_application_onboarding",
  "rate_limit_exceeded",
  "operators read TAD applications",
]) {
  assert.ok(baseMigration.includes(phrase), `base migration must include ${phrase}`);
}

for (const department of ["invoice", "sales", "client", "property", "practice", "member"]) {
  assert.ok(departmentMigration.includes(`'${department}'`), `department migration must support ${department}`);
  assert.ok(endpoint.includes(`${department}:`), `endpoint must label ${department}`);
  assert.ok(page.includes(`${department}:`), `operator inbox must label ${department}`);
}

for (const phrase of [
  "submit_tad_department_application",
  "tad_applications_department_check",
  "tad_applications_workflow_problem_check",
  "department = p_department",
  "v_application.department",
  "public.create_managed_business",
  "application_must_be_qualified",
  "to anon, authenticated",
]) {
  assert.ok(departmentMigration.includes(phrase), `department migration must include ${phrase}`);
}

for (const phrase of [
  "confirm_tad_application_commercial_gate",
  "invalid_payment_status",
  "commercial_acceptance_required",
  "payment_confirmed_at",
  "scope_accepted_at",
  "commercial_gate_updated",
  "ready_for_onboarding",
  "to authenticated",
]) {
  assert.ok(commercialMigration.includes(phrase), `commercial gate migration must include ${phrase}`);
}

for (const phrase of [
  "origin_not_allowed",
  "request_too_large",
  "invalid_form_session",
  "company_website",
  "required_confirmations_missing",
  "requestFingerprint",
  "submit_tad_department_application",
  "workflow_problem",
  "invalid_department",
  "too_many_requests",
  "RESEND_API_KEY",
  "/ops/applications",
]) {
  assert.ok(endpoint.includes(phrase), `endpoint must include ${phrase}`);
}

assert.ok(
  endpoint.indexOf('supabase.rpc("submit_tad_department_application"') < endpoint.indexOf("sendEmail({"),
  "email delivery must happen after database storage"
);
assert.ok(endpoint.includes('payload.department || "sales"'), "Sales clients remain backwards compatible");
assert.ok(endpoint.includes("payload.workflow_problem || payload.follow_up_problem"), "old Sales payload remains accepted");

for (const phrase of [
  "Managed admin intake",
  "list_tad_applications",
  "Confirm payment and scope",
  "Commercial gate complete",
  "Commercial gate incomplete",
  "payment_status",
  "payment_reference",
  "scope_accepted",
  "Create {label} workspace",
  "qualification_notes",
  "commercial_decision",
]) {
  assert.ok(page.includes(phrase), `operator inbox must include ${phrase}`);
}

assert.ok(actions.includes("update_tad_application"), "review action must use the audited RPC");
assert.ok(actions.includes("confirm_tad_application_commercial_gate"), "commercial gate must use the audited RPC");
assert.ok(actions.includes("start_tad_application_onboarding"), "onboarding action must use the audited RPC");
assert.ok(layout.includes('href="/ops/applications"'), "operator navigation must link to applications");

console.log("Multi-department TAD application and commercial gate contract passed.");
