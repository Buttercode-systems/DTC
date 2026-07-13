import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

const runId = String(process.env.E2E_RUN_ID || Date.now()).replace(/[^A-Za-z0-9_-]/g, "");
if (!runId) throw new Error("E2E_RUN_ID is required");

const operatorEmail = `ramatsienkoanyane07+tad-e2e-${runId}-operator@gmail.com`;
const operatorPassword = `Tad!${randomBytes(24).toString("base64url")}9aA`;
const invitationToken = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(invitationToken).digest("hex");
const businessName = `TAD E2E ${runId} Bootstrap`;

console.log(`::add-mask::${operatorPassword}`);
console.log(`::add-mask::${invitationToken}`);
console.log(`E2E_RUN_ID=${runId}`);
console.log(`E2E_OPERATOR_EMAIL=${operatorEmail}`);

const resultDir = "test-results/tad-live-e2e";
mkdirSync(resultDir, { recursive: true });
writeFileSync(
  `${resultDir}/registration-bootstrap-private.json`,
  JSON.stringify({ runId, operatorEmail, operatorPassword, invitationToken }, null, 2),
  { mode: 0o600 }
);
writeFileSync(
  `${resultDir}/registration-bootstrap-public.json`,
  JSON.stringify({ runId, operatorEmail, tokenHash, businessName, role: "owner" }, null, 2)
);

console.log("REGISTRATION_BOOTSTRAP_HASH_READY");
