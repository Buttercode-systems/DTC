import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const migration = read("supabase/migrations/0032_separate_duetoday_and_tad_platforms.sql");
const db = read("lib/db.ts");
const signup = read("app/signup/actions.ts");
const signupPage = read("app/signup/page.tsx");
const nav = read("components/NavLinks.tsx");
const today = read("app/app/page.tsx");
const layout = read("app/app/layout.tsx");
const platform = read("lib/platform.ts");
const departmentActions = read("app/app/departments/actions.ts");
const workflowActions = read("app/app/departments/workflow-actions.ts");
const teamActions = read("app/app/team/actions.ts");
const importActions = read("app/app/import/actions.ts");
const importPage = read("app/app/import/page.tsx");
const servicePage = read("app/app/service/page.tsx");
const accountPage = read("app/app/account/page.tsx");

assert.match(migration, /platform_key text not null default 'duetoday'/);
assert.match(migration, /check \(platform_key in \('duetoday','tad'\)\)/);
assert.match(migration, /set_business_platform/);

assert.doesNotMatch(db, /activate_all_tad_departments/);
assert.match(db, /platform_key: "duetoday" \| "tad"/);
assert.match(db, /Could not resolve workspace platform/);

assert.match(signup, /requestedProduct/);
assert.match(signup, /if \(product === "tad"\)/);
assert.match(signup, /activate_all_tad_departments/);
assert.match(signup, /Check your email to confirm your DueToday account/);
assert.match(signupPage, /product === "tad"/);

assert.match(nav, /DUETODAY_LINKS/);
assert.match(nav, /TAD_LINKS/);
assert.match(nav, /Leads/);
assert.match(nav, /Departments/);

assert.match(today, /DueTodayToday/);
assert.match(today, /TadToday/);
assert.match(today, /runEngine/);
assert.match(today, /get_tad_unified_today/);
assert.match(layout, /business\.platform_key === "tad"/);
assert.match(layout, /platform=\{business\.platform_key\}/);

assert.match(platform, /requireTadBusiness/);
assert.match(platform, /assertTadPlatform/);
for (const source of [departmentActions, workflowActions, teamActions, importActions]) {
  assert.match(source, /assertTadPlatform\(business\.platform_key\)/);
}
assert.match(servicePage, /requireTadBusiness/);
assert.match(accountPage, /requireTadBusiness/);

assert.match(importPage, /DueTodayImportPage/);
assert.match(importPage, /TadImportPage/);
assert.match(importPage, /ImportWorkbench/);
assert.match(importPage, /importDepartmentCsv/);

console.log("DTC/TAD platform boundary contract passed");
