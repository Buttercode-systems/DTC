import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0024_tad_application_pipeline.sql");
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
  assert.ok(migration.includes(phrase), `migration must include ${phrase}`);
}

assert.ok(migration.includes("to anon, authenticated"), "submission RPC must be callable by the public intake");
assert.ok(migration.includes("application_must_be_qualified"), "workspace creation must require qualification");
assert.ok(migration.includes("public.create_managed_business"), "onboarding must reuse the managed workspace function");

for (const phrase of [
  "origin_not_allowed",
  "request_too_large",
  "invalid_form_session",
  "company_website",
  "required_confirmations_missing",
  "requestFingerprint",
  "submit_tad_application",
  "too_many_requests",
  "RESEND_API_KEY",
  "/ops/applications",
]) {
  assert.ok(endpoint.includes(phrase), `endpoint must include ${phrase}`);
}

assert.ok(
  endpoint.indexOf('supabase.rpc("submit_tad_application"') < endpoint.indexOf("sendEmail({"),
  "email delivery must happen after database storage"
);

for (const phrase of [
  "Applications",
  "list_tad_applications",
  "Create Sales Admin workspace",
  "Customer lead and quote records never enter this public intake queue",
  "qualification_notes",
  "commercial_decision",
]) {
  assert.ok(page.includes(phrase), `operator inbox must include ${phrase}`);
}
assert.ok(actions.includes("update_tad_application"), "review action must use the audited RPC");
assert.ok(actions.includes("start_tad_application_onboarding"), "onboarding action must use the audited RPC");
assert.ok(layout.includes('href="/ops/applications"'), "operator navigation must link to applications");

console.log("Secure TAD application pipeline contract passed.");
