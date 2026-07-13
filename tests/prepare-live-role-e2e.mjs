import { readFileSync, writeFileSync } from "node:fs";

const path = "tests/tad-live-role-e2e.mjs";
let source = readFileSync(path, "utf8");

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error(`Could not locate ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  'import { randomBytes } from "node:crypto";',
  'import { createHmac } from "node:crypto";',
  "crypto import"
);

replaceOnce(
  [
    'const operatorPassword = `Tad!${randomBytes(24).toString("base64url")}`;',
    'const clientPassword = `Client!${randomBytes(24).toString("base64url")}`;',
  ].join("\n"),
  [
    'const jobSecret = process.env.E2E_JOB_SECRET;',
    'assert.ok(jobSecret, "E2E job secret is required");',
    'const derivePassword = (role, prefix) =>',
    '  `${prefix}${createHmac("sha256", jobSecret).update(`${runId}:${role}`).digest("base64url")}`;',
    'const operatorPassword = derivePassword("operator", "Tad!");',
    'const clientPassword = derivePassword("client", "Client!");',
  ].join("\n"),
  "password derivation"
);

replaceOnce(
  [
    "await signupOperator();",
    'await waitForPasswordSession(operatorEmail, operatorPassword, "OPERATOR");',
  ].join("\n"),
  'await waitForPasswordSession(operatorEmail, operatorPassword, "OPERATOR", 60_000);',
  "operator bootstrap calls"
);

const clientAccountStart = source.indexOf("async function createClientAccount(");
const clientAccountEnd = source.indexOf("\nasync function claimInvitation", clientAccountStart);
if (clientAccountStart < 0 || clientAccountEnd < 0) {
  throw new Error("Could not locate createClientAccount");
}
const clientAccountReplacement = [
  "async function assertClientJoinPage(page, url) {",
  '  await page.goto(url, { waitUntil: "networkidle" });',
  '  await page.getByRole("link", { name: "Create client account" }).click();',
  '  await page.waitForLoadState("networkidle");',
  '  await page.getByRole("heading", { name: "Create your Client Portal account" }).waitFor();',
  '  assert.equal(await page.getByLabel("Invited email").inputValue(), clientEmail);',
  '  await page.getByLabel("Create passphrase").waitFor();',
  '  await page.getByRole("button", { name: "Create Client Portal account" }).waitFor();',
  '  console.log("CLIENT_JOIN_PAGE_OK");',
  "}",
].join("\n");
source = `${source.slice(0, clientAccountStart)}${clientAccountReplacement}${source.slice(clientAccountEnd)}`;

replaceOnce(
  [
    "  await createClientAccount(clientPage, invoice.invitation);",
    '  await waitForPasswordSession(clientEmail, clientPassword, "CLIENT");',
  ].join("\n"),
  "  await assertClientJoinPage(clientPage, invoice.invitation);",
  "client signup calls"
);

const decisionStart = source.indexOf("async function clientDecisionAndReport(");
const decisionEnd = source.indexOf("\nasync function testManagedRouteRestrictions", decisionStart);
if (decisionStart < 0 || decisionEnd < 0) {
  throw new Error("Could not locate clientDecisionAndReport");
}
const decisionReplacement = [
  "async function switchClientWorkspace(page, businessId) {",
  '  await page.goto(`${appUrl}/app/service`, { waitUntil: "networkidle" });',
  '  const switcher = page.getByLabel("Client workspace");',
  "  if ((await switcher.count()) === 0) return;",
  "  if ((await switcher.inputValue()) !== businessId) {",
  "    await switcher.selectOption(businessId);",
  '    await page.waitForLoadState("networkidle");',
  "  }",
  "}",
  "",
  "async function clientDecisionAndReport(page, invoice, member, invoiceDecision, memberDecision) {",
  "  await switchClientWorkspace(page, invoice.businessId);",
  "  await page.getByText(invoiceDecision, { exact: true }).waitFor();",
  '  await page.locator(\'textarea[name="decision_note"]\').fill("Approved by the controlled client browser test.");',
  "  await Promise.all([",
  '    page.waitForLoadState("networkidle"),',
  '    page.getByRole("button", { name: "Approve" }).click(),',
  "  ]);",
  '  await page.getByText("No decisions are waiting.").waitFor();',
  "",
  '  const report = page.locator("article").filter({ hasText: "Latest report" }).first();',
  '  await report.locator(\'textarea[name="response_note"]\').fill("Continue after successful E2E verification.");',
  "  await Promise.all([",
  '    page.waitForLoadState("networkidle"),',
  '    report.getByRole("button", { name: "Continue" }).click(),',
  "  ]);",
  '  await page.getByText("Your decision:").waitFor();',
  "",
  "  await switchClientWorkspace(page, member.businessId);",
  "  await page.getByText(memberDecision, { exact: true }).waitFor();",
  '  await page.getByText("Owner or manager decision required").waitFor();',
  '  assert.equal(await page.getByRole("button", { name: "Approve" }).count(), 0);',
  '  await page.getByText("An owner or manager must submit the continue, change or stop decision.").waitFor();',
  '  console.log("CLIENT_OWNER_AND_VIEWER_PERMISSIONS_OK");',
  "}",
].join("\n");
source = `${source.slice(0, decisionStart)}${decisionReplacement}${source.slice(decisionEnd)}`;

writeFileSync(path, source);
console.log("Prepared live E2E for disposable operator and client identities.");
