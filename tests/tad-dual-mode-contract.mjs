import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0028_tad_saas_managed_platform.sql");
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
assert.ok(foundation.includes("unique (business_id, department)"), "one engagement per business department must remain enforced");

assert.equal(
  migration.includes("p_business_id uuid") && migration.includes("can_manage_business(p_business_id"),
  true,
  "department activation must require manager access"
);
assert.ok(migration.includes("when v_distinct_modes > 1 then 'hybrid'"));
assert.ok(migration.includes("includes_all_departments boolean not null default true"));

for (const label of ["Today", "Departments", "Approvals", "Reports", "Imports", "Account", "Settings"]) {
  assert.ok(nav.includes(`label: "${label}"`), `unified navigation must include ${label}`);
}
assert.equal(nav.includes("STANDALONE_LINKS"), false, "navigation must no longer split the product into old standalone and managed shells");

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
assert.ok(workflowActions.includes("create_service_work_item"));
assert.ok(workflowActions.includes("update_service_work_item"));

for (const phrase of [
  "One queue across every department",
  "get_tad_unified_today",
  "Invoice Admin",
  "Practice / Booking Admin",
  "Managed by TAD",
  "Self-service",
]) {
  assert.ok(today.includes(phrase), `unified Today must include ${phrase}`);
}

assert.ok(signup.includes("activate_all_tad_departments"));
assert.ok(signup.includes('p_delivery_mode: "self_service"'));
assert.ok(portal.includes("activate_all_tad_departments"));
assert.ok(portal.includes('p_delivery_mode: "managed"'));
assert.equal(middleware.includes("standaloneOnlyRoutes"), false, "middleware must allow one platform for both operating modes");

console.log("TAD SaaS + TAD Managed dual-mode contract passed.");
