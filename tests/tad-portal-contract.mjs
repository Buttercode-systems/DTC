import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const nav = read("components/NavLinks.tsx");
const appLayout = read("app/app/layout.tsx");
const opsLayout = read("app/ops/layout.tsx");
const login = read("app/login/page.tsx");
const signIn = read("app/auth/signin/route.ts");
const safeNext = read("lib/safe-next.ts");
const middleware = read("middleware.ts");
const operator = read("lib/operator.ts");
const start = read("app/start/page.tsx");
const portal = read("app/portal/page.tsx");
const hq = read("app/hq/page.tsx");
const account = read("app/app/account/page.tsx");
const approvals = read("components/service-desk/ApprovalSection.tsx");
const reports = read("components/service-desk/ReportSection.tsx");
const operatorBootstrap = read("supabase/migrations/0026_tad_operator_bootstrap_policy.sql");

for (const phrase of [
  "MANAGED_LINKS",
  'label: "Service Desk"',
  'label: "Decisions"',
  'label: "Reports"',
  'label: "Account"',
  "managedByTad",
  "Client portal navigation",
]) {
  assert.ok(nav.includes(phrase), `managed navigation must include ${phrase}`);
}
assert.ok(nav.includes("STANDALONE_LINKS"), "standalone DueToday navigation must remain available");
assert.ok(nav.includes('label: "Leads"'), "standalone navigation must retain Leads");
assert.ok(nav.includes('label: "Invoices"'), "standalone navigation must retain Invoices");

for (const phrase of [
  "The Admin",
  "Client Portal",
  "managedByTad={managed}",
  "Managed by The Admin Department",
  "!managed && <FeedbackForm",
]) {
  assert.ok(appLayout.includes(phrase), `managed client shell must include ${phrase}`);
}
assert.ok(appLayout.includes("Due<span"), "standalone DueToday brand must remain available");

for (const phrase of ["The Admin", "Admin HQ", "Applications", "Workflows", "Public site"]) {
  assert.ok(opsLayout.includes(phrase), `Admin HQ must include ${phrase}`);
}
assert.equal(opsLayout.includes('>DueToday<'), false, "Admin HQ must not present DueToday as the operator product");

for (const phrase of [
  'return "hq"',
  'return "portal"',
  "Admin HQ sign in",
  "Client Portal sign in",
  'searchParams.next ?? "/start"',
]) {
  assert.ok(login.includes(phrase), `login must include ${phrase}`);
}
for (const phrase of ["safeRelativeDestination", "applyRelativeDestination", '"/start"']) {
  assert.ok(signIn.includes(phrase), `sign-in redirect handling must include ${phrase}`);
}
for (const phrase of [
  "candidate.startsWith(\"/\")",
  "candidate.startsWith(\"//\")",
  "parsed.pathname",
  "parsed.search",
  "parsed.hash",
  "return fallback",
]) {
  assert.ok(safeNext.includes(phrase), `safe redirect helper must include ${phrase}`);
}

for (const phrase of [
  'pathname.startsWith("/hq")',
  'pathname.startsWith("/portal")',
  'pathname.startsWith("/start")',
  '"/app/pipeline"',
  '"/app/leads"',
  '"/app/quotes"',
  '"/app/invoices"',
  '"/app/customers"',
  '"/app/import"',
  '"/app/settings"',
  "active?.managed_by_tad",
  'url.pathname = "/app/service"',
]) {
  assert.ok(middleware.includes(phrase), `middleware must enforce ${phrase}`);
}

for (const phrase of ["is_current_tad_operator", 'redirect("/ops")', "business.managed_by_tad", '"/app/service"']) {
  assert.ok(start.includes(phrase), `role-aware start must include ${phrase}`);
}
assert.ok(portal.includes("business.managed_by_tad"), "portal entry must verify managed status");
assert.ok(portal.includes('"/app/service"'), "portal entry must open the Service Desk");
assert.ok(hq.includes("requireOperator"), "Admin HQ entry must require an operator");
assert.ok(hq.includes('redirect("/ops")'), "Admin HQ entry must open the operator workspace");
assert.ok(operator.includes('/login?next=/hq'), "operator authentication must use the branded HQ login");
assert.ok(operator.includes('claim_first_tad_operator'), "operator entry must run the bootstrap claim");
assert.ok(operator.includes('is_current_tad_operator'), "operator entry must verify the resulting role");

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
assert.equal(
  operatorBootstrap.includes("if v_email not in ('buttercoder.dev@gmail.com','bvsic101@gmail.com')"),
  false,
  "the bootstrap policy must not regress to the stale two-email production rule"
);

for (const phrase of [
  "Account and service access",
  "Managed by The Admin Department",
  "What belongs in this portal",
  "Contact TAD",
  'redirect("/app/settings")',
]) {
  assert.ok(account.includes(phrase), `managed account page must include ${phrase}`);
}
assert.ok(approvals.includes('id="decisions"'), "Service Desk must expose the decisions anchor");
assert.ok(reports.includes('id="reports"'), "Service Desk must expose the reports anchor");

console.log("TAD Admin HQ, Client Portal and operator bootstrap contract passed.");