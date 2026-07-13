import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const baseMigration = read("supabase/migrations/0024_tad_application_pipeline.sql");
const departmentMigration = read("supabase/migrations/0025_multi_department_tad_applications.sql");
const lifecycleMigration = read("supabase/migrations/0027_client_access_and_commercial_gates.sql");
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
  "Create {departmentLabel} workspace",
  "Operational records never enter this public intake queue",
  "qualification_notes",
  "commercial_decision",
  "payment_status",
  "scope_accepted",
  "Workspace locked until all gates pass",
  "DEPARTMENT_LABELS",
  "OFFER_PATHS",
]) {
  assert.ok(page.includes(phrase), `operator inbox must include ${phrase}`);
}

for (const phrase of [
  "review_tad_application",
  "commercial_acceptance_required",
  "payment_confirmation_required",
  "scope_acceptance_required",
]) {
  assert.ok(lifecycleMigration.includes(phrase), `commercial lifecycle migration must include ${phrase}`);
}
assert.ok(actions.includes("review_tad_application"), "review action must use the gated audited RPC");
assert.ok(actions.includes("start_tad_application_onboarding"), "onboarding action must use the audited RPC");
assert.ok(layout.includes('href="/ops/applications"'), "operator navigation must link to applications");
assert.ok(layout.includes('href="/ops/access"'), "operator navigation must link to client access");

console.log("Multi-department TAD application and commercial gate contract passed.");
