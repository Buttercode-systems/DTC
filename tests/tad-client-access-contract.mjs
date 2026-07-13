import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const schema = read("supabase/migrations/0028_managed_client_access_schema.sql");
const invitations = read("supabase/migrations/0029_managed_client_invitation_functions.sql");
const access = read("supabase/migrations/0030_managed_client_claim_and_access.sql");
const operatorPage = read("app/ops/client/[businessId]/access/page.tsx");
const operatorActions = read("app/ops/client/[businessId]/access/actions.ts");
const invitePage = read("app/invite/[token]/page.tsx");
const inviteActions = read("app/invite/[token]/actions.ts");
const clientLayout = read("app/ops/client/[businessId]/layout.tsx");

for (const phrase of [
  "managed_client_invitations",
  "token_hash text not null unique",
  "role in ('owner', 'manager', 'viewer')",
  "status in ('pending', 'claimed', 'revoked', 'expired')",
  "7 days",
  "enable row level security",
  "revoke all",
]) assert.ok(schema.includes(phrase), `client access schema must include ${phrase}`);

for (const phrase of [
  "create_managed_client_invitation",
  "get_managed_client_invitation",
  "operator_access_required",
  "valid_email_required",
  "invalid_client_role",
  "extensions.gen_random_bytes",
  "extensions.digest",
  "to anon, authenticated",
]) assert.ok(invitations.includes(phrase), `invitation migration must include ${phrase}`);

for (const phrase of [
  "claim_managed_client_invitation",
  "invitation_email_mismatch",
  "invitation_expired",
  "business_memberships",
  "user_preferences",
  "get_managed_client_access",
  "revoke_managed_client_invitation",
  "deactivate_managed_client_access",
]) assert.ok(access.includes(phrase), `claim/access migration must include ${phrase}`);

for (const phrase of [
  "Client Portal access",
  "Grant portal access",
  "Client invitation link",
  "Create invitation",
  "Deactivate",
  "Revoke",
]) assert.ok(operatorPage.includes(phrase), `operator access page must include ${phrase}`);

for (const phrase of [
  "create_managed_client_invitation",
  "revoke_managed_client_invitation",
  "deactivate_managed_client_access",
  "encodeURIComponent(result.token)",
]) assert.ok(operatorActions.includes(phrase), `operator access actions must include ${phrase}`);

for (const phrase of [
  "Client Portal Invitation",
  "Sign in with",
  "Create an account with this email",
  "emailMatches",
  "Accept and open Client Portal",
]) assert.ok(invitePage.includes(phrase), `client invitation page must include ${phrase}`);
assert.ok(inviteActions.includes("claim_managed_client_invitation"), "claim action must use the audited RPC");
assert.ok(inviteActions.includes('redirect("/portal")'), "claim action must open the client portal");
assert.ok(clientLayout.includes("Client access"), "managed workspace must link to client access");

console.log("Managed client access contract passed.");
