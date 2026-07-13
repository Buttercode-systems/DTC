import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const nav = read("components/NavLinks.tsx");
const appLayout = read("app/app/layout.tsx");
const opsLayout = read("app/ops/layout.tsx");
const login = read("app/login/page.tsx");
const signIn = read("app/auth/signin/route.ts");
const middleware = read("middleware.ts");
const operator = read("lib/operator.ts");
const start = read("app/start/page.tsx");
const portal = read("app/portal/page.tsx");
const hq = read("app/hq/page.tsx");
const account = read("app/app/account/page.tsx");
const approvals = read("components/service-desk/ApprovalSection.tsx");
const reports = read("components/service-desk/ReportSection.tsx");
const applications = read("app/ops/applications/page.tsx");
const operatorBootstrap = read("supabase/migrations/0026_tad_operator_bootstrap_policy.sql");

for (const phrase of [
  "PLATFORM_LINKS",
  'label: "Today"',
  'label: "Departments"',
  'label: "Approvals"',
  'label: "Reports"',
  'label: "Imports"',
  'label: "Team"',
  'label: "Account"',
  'label: "Settings"',
  "managedByTad",
  "TAD Managed navigation",
  "TAD SaaS navigation",
]) {
  assert.ok(nav.includes(phrase), `unified navigation must include ${phrase}`);
}
assert.equal(nav.includes("STANDALONE_LINKS"), false, "old split navigation must be removed");
assert.equal(nav.includes("MANAGED_LINKS"), false, "old managed-only navigation must be removed");

for (const phrase of [
  "The Admin",
  "Client Portal",
  "managedByTad={managed}",
  "Managed by The Admin Department",
]) {
  assert.ok(appLayout.includes(phrase), `app shell must include ${phrase}`);
}

for (const phrase of ["The Admin", "Admin HQ", "Applications", "Workflows", "Public site"]) {
  assert.ok(opsLayout.includes(phrase), `Admin HQ must include ${phrase}`);
}
assert.equal(opsLayout.includes(">DueToday<"), false, "Admin HQ must not present DueToday as the operator product");

for (const phrase of [
  'return "hq"',
  'return "portal"',
  "Admin HQ sign in",
  "Client Portal sign in",
  'searchParams.next ?? "/start"',
]) {
  assert.ok(login.includes(phrase), `login must include ${phrase}`);
}
assert.ok(signIn.includes('typeof value === "string" ? value : "/start"'), "sign-in default must be role-aware");
assert.ok(signIn.includes(': "/start"'), "unsafe redirects must fall back to /start");

for (const phrase of [
  'pathname.startsWith("/app")',
  'pathname.startsWith("/hq")',
  'pathname.startsWith("/portal")',
  'pathname.startsWith("/start")',
]) {
  assert.ok(middleware.includes(phrase), `middleware must protect ${phrase}`);
}
assert.equal(middleware.includes("standaloneOnlyRoutes"), false, "managed users must be allowed into the same platform routes");
assert.equal(middleware.includes('url.pathname = "/app/service"'), false, "middleware must not force managed users into one service page");

for (const phrase of ["is_current_tad_operator", 'redirect("/ops")', 'redirect("/app")']) {
  assert.ok(start.includes(phrase), `role-aware start must include ${phrase}`);
}
assert.ok(portal.includes("claim_tad_client_access"), "portal must securely claim client access");
assert.ok(portal.includes("activate_all_tad_departments"), "managed portal entry must activate all six departments");
assert.ok(portal.includes('p_delivery_mode: "managed"'), "managed portal entry must use managed mode");
assert.ok(portal.includes('redirect("/app")'), "portal entry must open the unified Today queue");
assert.ok(hq.includes("requireOperator"), "Admin HQ entry must require an operator");
assert.ok(hq.includes('redirect("/ops")'), "Admin HQ entry must open the operator workspace");
assert.ok(operator.includes("/login?next=/hq"), "operator authentication must use the branded HQ login");
assert.ok(operator.includes("claim_first_tad_operator"), "operator entry must run the bootstrap claim");
assert.ok(operator.includes("is_current_tad_operator"), "operator entry must verify the resulting role");

for (const phrase of [
  "Open client activation link",
  "Creating the workspace does not automatically email the client",
  "Send this activation link only after scope and payment are confirmed",
  'next: "/portal"',
  "application.email",
  "application.business_name",
]) {
  assert.ok(applications.includes(phrase), `operator onboarding handoff must include ${phrase}`);
}
assert.ok(applications.includes("A different email will not receive access"));

for (const phrase of [
  "tad_operator_bootstrap_emails",
  "ramatsienkoanyane07@gmail.com",
  "select lower(trim(email))",
  "allowed.email = v_email",
  "pg_advisory_xact_lock",
  "grant execute on function public.claim_first_tad_operator() to authenticated",
  "insert into public.platform_operators",
]) {
  assert.ok(operatorBootstrap.includes(phrase), `operator bootstrap migration must include ${phrase}`);
}
assert.ok(
  operatorBootstrap.indexOf("tad_operator_bootstrap_emails") < operatorBootstrap.indexOf("create or replace function public.claim_first_tad_operator"),
  "the allowlist table must exist before the bootstrap function is replaced"
);

for (const phrase of [
  "One account controls TAD SaaS and TAD Managed",
  "Workspace mode",
  "Active departments",
  "Managed by TAD",
  "Manage departments",
  "Manage team",
]) {
  assert.ok(account.includes(phrase), `account page must include ${phrase}`);
}
assert.ok(approvals.includes('id="decisions"'), "Service Desk must expose the decisions anchor");
assert.ok(reports.includes('id="reports"'), "Service Desk must expose the reports anchor");

console.log("TAD unified SaaS, Managed, Admin HQ and Client Portal contract passed.");
