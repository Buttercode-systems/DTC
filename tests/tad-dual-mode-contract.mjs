import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0028_tad_saas_managed_platform.sql");
const boundary = read("supabase/migrations/0032_separate_duetoday_and_tad_platforms.sql");
const foundation = read("supabase/migrations/0012_tad_service_delivery_foundation.sql");
const nav = read("components/NavLinks.tsx");
const departments = read("app/app/departments/page.tsx");
const departmentPage = read("app/app/departments/[department]/page.tsx");
const departmentActions = read("app/app/departments/actions.ts");
const workflowActions = read("app/app/departments/workflow-actions.ts");
const today = read("app/app/page.tsx");
const signup = read("app/signup/actions.ts");
const portal = read("app/portal/page.tsx");
const middleware = read("middleware.ts");

for (const phrase of [
  "delivery_mode in ('self_service','managed','hybrid')",
  "workspace_plans",
  "workspace_subscriptions",
  "workspace_invitations",
  "includes_all_departments",
  "activate_tad_department",
  "activate_all_tad_departments",
  "set_tad_department_mode",
  "get_tad_department_center",
  "get_tad_unified_today",
  "array['invoice','sales','client','property','practice','member']",
]) {
  assert.ok(migration.includes(phrase), `dual-mode migration must include ${phrase}`);
}
assert.ok(boundary.includes("platform_key"), "the shared repository must keep an explicit product boundary");
assert.ok(boundary.includes("'duetoday','tad'"), "only DueToday and TAD platform keys are valid");
assert.ok(foundation.includes("unique (business_id, department)"), "one engagement per business department must remain enforced");

assert.equal(
  migration.includes("p_business_id uuid") && migration.includes("can_manage_business(p_business_id"),
  true,
  "department activation must require manager access"
);
assert.ok(migration.includes("when v_distinct_modes > 1 then 'hybrid'"));
assert.ok(migration.includes("includes_all_departments boolean not null default true"));

for (const label of ["Today", "Departments", "Approvals", "Reports", "Imports", "Account", "Settings"]) {
  assert.ok(nav.includes(`label: "${label}"`), `TAD navigation must include ${label}`);
}
assert.ok(nav.includes("TAD_LINKS"), "TAD SaaS must have its own navigation");
assert.ok(nav.includes("MANAGED_LINKS"), "TAD Managed must have its own focused navigation");
assert.ok(nav.includes("DUETODAY_LINKS"), "DueToday must retain its own navigation");
assert.ok(nav.includes('platform === "tad" ? TAD_LINKS : DUETODAY_LINKS'));

for (const phrase of [
  "One platform · Six departments",
  "Activate all for SaaS",
  "Activate all as Managed",
  "Run it ourselves",
  "Assign to TAD",
  "Pause department",
]) {
  assert.ok(departments.includes(phrase), `department center must include ${phrase}`);
}

for (const phrase of [
  "createDepartmentRecord",
  "updateDepartmentRecord",
  "service_workflow_templates",
  "service_work_items",
  "Open unified Today",
]) {
  assert.ok(departmentPage.includes(phrase), `department workspace must include ${phrase}`);
}
assert.ok(departmentActions.includes("activate_all_tad_departments"));
assert.ok(departmentActions.includes("set_tad_department_mode"));
assert.ok(departmentActions.includes("assertTadPlatform"));
assert.ok(workflowActions.includes("create_service_work_item"));
assert.ok(workflowActions.includes("update_service_work_item"));
assert.ok(workflowActions.includes("assertTadPlatform"));

for (const phrase of [
  "One queue across every department",
  "get_tad_unified_today",
  "Invoice Admin",
  "Practice / Booking Admin",
  "Managed by TAD",
  "Self-service",
  "DueTodayToday",
  "TadToday",
]) {
  assert.ok(today.includes(phrase), `product-aware Today must include ${phrase}`);
}

assert.ok(signup.includes("set_business_platform"));
assert.ok(signup.includes('if (product === "tad")'));
assert.ok(signup.includes("activate_all_tad_departments"));
assert.ok(signup.includes('p_delivery_mode: "self_service"'));
assert.ok(portal.includes("activate_all_tad_departments"));
assert.ok(portal.includes('p_delivery_mode: "managed"'));
assert.equal(middleware.includes("standaloneOnlyRoutes"), false, "workspace-level guards must resolve product access after authentication");

console.log("TAD SaaS + TAD Managed dual-mode contract passed with the DueToday boundary intact.");
