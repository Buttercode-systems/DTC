import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0027_client_access_and_commercial_gates.sql");
const applications = read("app/ops/applications/page.tsx");
const applicationActions = read("app/ops/applications/actions.ts");
const accessActions = read("app/ops/client/[businessId]/access/actions.ts");
const accessSection = read("app/ops/client/[businessId]/access/ClientAccessSection.tsx");
const acceptPage = read("app/portal/accept/page.tsx");
const acceptAction = read("app/portal/accept/actions.ts");
const joinPage = read("app/portal/join/page.tsx");
const joinAction = read("app/portal/join/actions.ts");
const signin = read("app/auth/signin/route.ts");
const callback = read("app/auth/callback/route.ts");
const middleware = read("middleware.ts");
const safeNext = read("lib/safe-next.ts");
const opsLayout = read("app/ops/layout.tsx");
const serviceLayout = read("app/app/service/layout.tsx");

for (const phrase of [
  "payment_status",
  "payment_reference",
  "payment_confirmed_at",
  "scope_accepted_at",
  "commercial_acceptance_required",
  "payment_confirmation_required",
  "scope_acceptance_required",
]) {
  assert.ok(migration.includes(phrase), `commercial gate migration must include ${phrase}`);
}
assert.ok(
  migration.indexOf("commercial_acceptance_required") < migration.indexOf("public.create_managed_business"),
  "onboarding gates must run before workspace creation"
);

for (const phrase of [
  'name="payment_status"',
  'name="payment_reference"',
  'name="scope_accepted"',
  "Workspace locked until all gates pass",
  "commerciallyReady",
]) {
  assert.ok(applications.includes(phrase), `Admin HQ review must expose ${phrase}`);
}
assert.ok(applicationActions.includes('supabase.rpc("review_tad_application"'), "reviews must use the gated RPC");
assert.ok(applicationActions.includes("/access`"), "onboarding must open client access setup next");

for (const phrase of [
  "managed_client_invitations",
  "create_managed_client_invitation",
  "get_managed_client_invitation",
  "claim_managed_client_invitation",
  "get_managed_client_access",
  "revoke_managed_client_invitation",
  "deactivate_managed_client_access",
  "extensions.gen_random_bytes(32)",
  "extensions.digest",
  "invitation_email_mismatch",
  "expires_at <= now()",
]) {
  assert.ok(migration.includes(phrase), `client invitation lifecycle must include ${phrase}`);
}
assert.equal(migration.includes("token text not null"), false, "invitation bearer tokens must not be stored in plaintext");
assert.ok(migration.includes("token_hash text not null unique"), "only a unique token hash may be stored");
assert.ok(migration.includes("revoke all on table public.managed_client_invitations"), "invitation table must not be directly readable");
assert.ok(migration.includes("grant execute on function public.get_managed_client_invitation(text) to anon, authenticated"), "bearer invitation preview must use a narrow RPC");

for (const phrase of [
  "Create Client Portal invitation",
  "Copy link",
  "Deactivate access",
  "Revoke link",
  "exact email address",
]) {
  assert.ok(accessSection.includes(phrase), `operator client access UI must include ${phrase}`);
}
assert.ok(accessActions.includes("/portal/accept?token="), "operator must receive a real acceptance link");
assert.ok(accessActions.includes("create_managed_client_invitation"), "operator UI must call invitation RPC");

for (const phrase of [
  "Join {invitation.business_name}",
  "Sign in",
  "Create client account",
  "ClaimInvitationForm",
]) {
  assert.ok(acceptPage.includes(phrase), `invitation acceptance page must include ${phrase}`);
}
assert.ok(acceptAction.includes("claim_managed_client_invitation"), "client acceptance must claim the invitation");
assert.ok(acceptAction.includes('redirect("/app/service")'), "accepted clients must land in the Service Desk");

for (const phrase of [
  "Create your Client Portal account",
  "will not create a separate DueToday business",
  "JoinManagedClientForm",
]) {
  assert.ok(joinPage.includes(phrase), `managed signup page must include ${phrase}`);
}
assert.ok(joinAction.includes("managed-signup:"), "managed signup must be rate limited");
assert.ok(joinAction.includes("emailRedirectTo"), "managed signup confirmation must return to the invitation");
assert.ok(joinAction.includes("claim_managed_client_invitation"), "immediate signup sessions must claim access");
assert.equal(joinAction.includes("provision_my_business"), false, "managed client signup must never provision a standalone business");

for (const source of [signin, callback]) {
  assert.ok(source.includes("applyRelativeDestination"), "auth handoffs must preserve invitation query parameters");
  assert.ok(source.includes("safeRelativeDestination"), "auth handoffs must reject external redirects");
}
assert.ok(safeNext.includes('candidate.startsWith("//")'), "protocol-relative redirects must be rejected");
assert.ok(middleware.includes('pathname === "/portal/accept"'), "invitation acceptance must be publicly reachable");
assert.ok(middleware.includes('pathname === "/portal/join"'), "managed account creation must be publicly reachable");
assert.ok(middleware.includes("request.nextUrl.search"), "protected redirects must preserve query parameters");

assert.ok(opsLayout.includes('href="/ops/access"'), "Admin HQ must expose client access management");
assert.ok(serviceLayout.includes("Service Desk — The Admin Department"), "managed portal metadata must use TAD branding");

console.log("Managed service commercial, invitation and auth lifecycle contract passed.");
