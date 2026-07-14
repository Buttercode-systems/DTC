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

console.log("DTC/TAD platform boundary contract passed");
