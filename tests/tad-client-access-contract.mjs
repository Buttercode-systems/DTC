import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const historicalClaim = read("supabase/migrations/0027_tad_client_portal_access.sql");
const invitationMigration = read("supabase/migrations/0027_client_access_and_commercial_gates.sql");
const registrationMigration = read("supabase/migrations/0030_managed_client_registration.sql");
const disableAutomaticClaim = read("supabase/migrations/0032_require_explicit_tad_client_invitations.sql");
const portal = read("app/portal/page.tsx");
const signupPage = read("app/signup/page.tsx");
const signupForm = read("app/signup/SignUpForm.tsx");
const signupActions = read("app/signup/actions.ts");
const acceptAction = read("app/portal/accept/actions.ts");
const joinAction = read("app/portal/join/actions.ts");
const joinPage = read("app/portal/join/page.tsx");

assert.ok(
  historicalClaim.includes("function public.claim_tad_client_access()"),
  "the historical email-matched claim migration remains replayable"
);

for (const phrase of [
  "explicit_client_invitation_required",
  "revoke all on function public.claim_tad_client_access() from public, anon, authenticated",
  "grant execute on function public.claim_tad_client_access() to service_role",
]) {
  assert.ok(disableAutomaticClaim.includes(phrase), `automatic client claim retirement must include ${phrase}`);
}

assert.equal(
  portal.includes('supabase.rpc("claim_tad_client_access")'),
  false,
  "opening /portal must never grant a workspace from email alone"
);
assert.ok(portal.includes("requireBusiness"), "portal entry must require access that already exists");
assert.ok(portal.includes('redirect(business.managed_by_tad ? "/app/service" : "/app")'));

for (const phrase of [
  "managed_client_invitations",
  "token_hash text not null unique",
  "claim_managed_client_invitation",
  "invitation_email_mismatch",
  "invitation_expired",
]) {
  assert.ok(invitationMigration.includes(phrase), `explicit invitation lifecycle must include ${phrase}`);
}
assert.equal(invitationMigration.includes("token text not null"), false, "invitation tokens must not be stored in plaintext");

for (const phrase of [
  "reserve_managed_client_registration",
  "claim_managed_client_invitation_for_user",
  "auth.role() <> 'service_role'",
  "auth_user_email_mismatch",
  "registration_attempt_limit_reached",
]) {
  assert.ok(registrationMigration.includes(phrase), `verified registration must include ${phrase}`);
}

for (const source of [signupPage, signupForm, signupActions]) {
  assert.equal(source.includes("tadMode"), false, "standalone DueToday signup must not become a TAD access path");
  assert.equal(source.includes("claim_tad_client_access"), false, "standalone signup must not claim managed workspaces");
}
assert.ok(signupPage.includes("Install DueToday"), "standalone DueToday signup must remain available");
assert.ok(signupActions.includes('supabase.rpc("provision_my_business"'), "standalone signup must retain self-service provisioning");

assert.ok(acceptAction.includes('supabase.rpc("claim_managed_client_invitation"'), "existing accounts must claim the exact invitation");
assert.ok(joinAction.includes("/functions/v1/managed-client-register"), "new managed clients must register through the verified invitation function");
assert.ok(joinAction.includes("supabase.auth.setSession"), "verified registration must establish a normal session");
assert.ok(joinPage.includes("Create your Client Portal account"), "the invitation-specific registration screen must remain branded for TAD");
assert.equal(joinAction.includes("auth.signUp"), false, "managed registration must not depend on the default SMTP confirmation path");
assert.equal(joinAction.includes("provision_my_business"), false, "managed registration must never create a standalone DueToday business");

console.log("TAD explicit invitation, verified registration and workspace isolation contract passed.");
