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
assert.ok(signIn.includes('typeof value === "string" ? value : "/start"'), "sign-in default must be role-aware");
assert.ok(signIn.includes(': "/start"'), "unsafe redirects must fall back to /start");

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

console.log("TAD Admin HQ and Client Portal unification contract passed.");
