import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const runId = String(process.env.E2E_RUN_ID || "").replace(/[^A-Za-z0-9_-]/g, "");
const jobSecret = process.env.E2E_JOB_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(runId && jobSecret && supabaseUrl && anonKey, "E2E identity wait configuration is incomplete");

const derivePassword = (role, prefix) =>
  `${prefix}${createHmac("sha256", jobSecret).update(`${runId}:${role}`).digest("base64url")}`;

const identities = [
  {
    label: "OPERATOR",
    email: `ramatsienkoanyane07+tad-e2e-${runId}-operator@gmail.com`,
    password: derivePassword("operator", "Tad!"),
  },
  {
    label: "CLIENT",
    email: `ramatsienkoanyane07+tad-e2e-${runId}-client@gmail.com`,
    password: derivePassword("client", "Client!"),
  },
];

for (const identity of identities) {
  console.log(`::add-mask::${identity.password}`);
}

async function waitForIdentity(identity, timeoutMs = 15 * 60_000) {
  const started = Date.now();
  let lastError = "not provisioned";
  while (Date.now() - started < timeoutMs) {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({
      email: identity.email,
      password: identity.password,
    });
    if (data.session) {
      await client.auth.signOut();
      console.log(`${identity.label}_IDENTITY_READY`);
      return;
    }
    lastError = error?.message || "session not ready";
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
  throw new Error(`${identity.label} identity was not provisioned: ${lastError}`);
}

await Promise.all(identities.map((identity) => waitForIdentity(identity)));
console.log("DISPOSABLE_IDENTITIES_READY");
