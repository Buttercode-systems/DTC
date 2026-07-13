import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0027_tad_client_portal_access.sql");
const portal = read("app/portal/page.tsx");
const signupPage = read("app/signup/page.tsx");
const signupForm = read("app/signup/SignUpForm.tsx");
const signupActions = read("app/signup/actions.ts");
const callback = read("app/auth/callback/route.ts");

for (const phrase of [
  "function public.claim_tad_client_access()",
  "from auth.users",
  "lower(trim(coalesce(b.primary_contact_email, ''))) = v_email",
  "b.managed_by_tad",
  "b.service_status <> 'closed'",
  "insert into public.business_memberships",
  "'manager'",
  "on conflict (business_id, user_id) do update",
  "client_portal_access_claimed",
  "grant execute on function public.claim_tad_client_access() to authenticated",
]) {
  assert.ok(migration.includes(phrase), `client access migration must include ${phrase}`);
}

assert.equal(
  migration.includes("p_business_id"),
  false,
  "client access must never accept a business id from the browser"
);
assert.equal(
  migration.includes("p_email"),
  false,
  "client access must derive the verified email from auth.users"
);
assert.ok(
  migration.includes("when public.business_memberships.role in ('owner', 'operator')"),
  "claiming access must not downgrade privileged existing memberships"
);

assert.ok(portal.includes('supabase.rpc("claim_tad_client_access")'));
assert.ok(portal.includes('redirect("/login?next=/portal")'));
assert.ok(
  portal.indexOf('supabase.rpc("claim_tad_client_access")') <
    portal.indexOf('const { business } = await requireBusiness()'),
  "verified access must be claimed before requireBusiness can provision a standalone workspace"
);

for (const phrase of [
  "Activate your Client Portal",
  "same email address supplied to The Admin Department",
  "Client Portal",
  "initialEmail",
  "initialBusiness",
  "tadMode",
]) {
  assert.ok(signupPage.includes(phrase), `TAD signup page must include ${phrase}`);
}
for (const phrase of ["name=\"next\"", "name=\"tad_mode\"", "Activate Client Portal"]) {
  assert.ok(signupForm.includes(phrase), `TAD signup form must include ${phrase}`);
}
for (const phrase of [
  "emailRedirectTo",
  "/auth/callback?next=/portal",
  'supabase.rpc("claim_tad_client_access")',
  "No managed TAD workspace matches this email address",
  "redirect(next.startsWith(\"/portal\") ? next : \"/portal\")",
]) {
  assert.ok(signupActions.includes(phrase), `TAD signup action must include ${phrase}`);
}
assert.ok(callback.includes("safeNext"), "confirmation callback must preserve safe role-aware redirects");

console.log("TAD verified client activation and workspace isolation contract passed.");
