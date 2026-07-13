import { readFileSync, writeFileSync } from "node:fs";

const path = "tests/tad-live-role-e2e.mjs";
let source = readFileSync(path, "utf8");

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error(`Could not locate ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  'import { mkdirSync, writeFileSync } from "node:fs";',
  'import { mkdirSync, readFileSync, writeFileSync } from "node:fs";',
  "filesystem import"
);
replaceOnce(
  'const operatorEmail = `ramatsienkoanyane07+tad-e2e-${runId}-operator@gmail.com`;',
  [
    'const bootstrap = JSON.parse(readFileSync("test-results/tad-live-e2e/registration-bootstrap-private.json", "utf8"));',
    'assert.equal(bootstrap.runId, runId, "Registration bootstrap run ID must match");',
    'const operatorEmail = bootstrap.operatorEmail;',
  ].join("\n"),
  "operator email"
);
replaceOnce(
  'const operatorPassword = `Tad!${randomBytes(24).toString("base64url")}`;',
  'const operatorPassword = bootstrap.operatorPassword;',
  "operator passphrase"
);

const signupStart = source.indexOf("async function signupOperator(");
const signupEnd = source.indexOf("\nasync function waitForPasswordSession", signupStart);
if (signupStart < 0 || signupEnd < 0) throw new Error("Could not locate signupOperator");
const bootstrapFunction = `async function bootstrapOperatorWithInvitation(page) {
  const invitationUrl = \`\${appUrl}/portal/join?token=\${encodeURIComponent(bootstrap.invitationToken)}\`;
  const started = Date.now();
  while (Date.now() - started < 15 * 60_000) {
    await page.goto(invitationUrl, { waitUntil: "networkidle" });
    if ((await page.getByRole("heading", { name: "Create your Client Portal account" }).count()) > 0) {
      assert.equal(await page.getByLabel("Invited email").inputValue(), operatorEmail);
      await page.getByLabel("Create passphrase").fill(operatorPassword);
      await Promise.all([
        page.waitForURL(/\\/app\\/service/, { timeout: 60_000 }),
        page.getByRole("button", { name: "Create Client Portal account" }).click(),
      ]);
      await page.getByRole("heading", { name: "Your Service Desk" }).waitFor();
      console.log("OPERATOR_INVITATION_REGISTRATION_OK");
      return;
    }
    console.log("WAITING_OPERATOR_BOOTSTRAP_INVITATION");
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
  throw new Error("Operator bootstrap invitation timed out");
}
`;
source = `${source.slice(0, signupStart)}${bootstrapFunction}${source.slice(signupEnd)}`;

replaceOnce(
  [
    "await signupOperator();",
    'await waitForPasswordSession(operatorEmail, operatorPassword, "OPERATOR");',
    "",
  ].join("\n"),
  "",
  "open-signup bootstrap calls"
);
replaceOnce(
  "try {\n  await waitForOperatorAccess(operatorPage);",
  [
    "try {",
    "  await bootstrapOperatorWithInvitation(operatorPage);",
    "  await operatorContext.clearCookies();",
    '  await waitForPasswordSession(operatorEmail, operatorPassword, "OPERATOR", 60_000);',
    "  await waitForOperatorAccess(operatorPage);",
  ].join("\n"),
  "operator browser start"
);

const accountStart = source.indexOf("async function createClientAccount(");
const accountEnd = source.indexOf("\nasync function claimInvitation", accountStart);
if (accountStart < 0 || accountEnd < 0) throw new Error("Could not locate createClientAccount");
const accountReplacement = `async function createClientAccount(page, url, department) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Create client account" }).click();
  await page.waitForLoadState("networkidle");
  assert.equal(await page.getByLabel("Invited email").inputValue(), clientEmail);
  await page.getByLabel("Create passphrase").fill(clientPassword);
  await Promise.all([
    page.waitForURL(/\\/app\\/service/, { timeout: 60_000 }),
    page.getByRole("button", { name: "Create Client Portal account" }).click(),
  ]);
  await page.getByRole("heading", { name: "Your Service Desk" }).waitFor();
  await page.getByText(department.label, { exact: true }).waitFor();
  console.log("CLIENT_INVITATION_REGISTRATION_OK");
}
`;
source = `${source.slice(0, accountStart)}${accountReplacement}${source.slice(accountEnd)}`;

replaceOnce(
  [
    "  await createClientAccount(clientPage, invoice.invitation);",
    '  await waitForPasswordSession(clientEmail, clientPassword, "CLIENT");',
    "  await claimInvitation(clientPage, invoice, true);",
    "  for (const department of departments.slice(1)) await claimInvitation(clientPage, department);",
  ].join("\n"),
  [
    "  await createClientAccount(clientPage, invoice.invitation, invoice);",
    "  for (const department of departments.slice(1)) await claimInvitation(clientPage, department);",
  ].join("\n"),
  "client registration sequence"
);

const decisionStart = source.indexOf("async function clientDecisionAndReport(");
const decisionEnd = source.indexOf("\nasync function testManagedRouteRestrictions", decisionStart);
if (decisionStart < 0 || decisionEnd < 0) throw new Error("Could not locate clientDecisionAndReport");
const decisionReplacement = `async function switchClientWorkspace(page, businessId) {
  await page.goto(\`\${appUrl}/app/service\`, { waitUntil: "networkidle" });
  const switcher = page.getByLabel("Client workspace");
  if ((await switcher.count()) === 0) return;
  if ((await switcher.inputValue()) !== businessId) {
    await switcher.selectOption(businessId);
    await page.waitForLoadState("networkidle");
  }
}

async function clientDecisionAndReport(page, invoice, member, invoiceDecision, memberDecision) {
  await switchClientWorkspace(page, invoice.businessId);
  await page.getByText(invoiceDecision, { exact: true }).waitFor();
  await page.locator('textarea[name="decision_note"]').fill("Approved by the controlled client browser test.");
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.getByRole("button", { name: "Approve" }).click(),
  ]);
  await page.getByText("No decisions are waiting.").waitFor();

  const report = page.locator("article").filter({ hasText: "Latest report" }).first();
  await report.locator('textarea[name="response_note"]').fill("Continue after successful E2E verification.");
  await Promise.all([
    page.waitForLoadState("networkidle"),
    report.getByRole("button", { name: "Continue" }).click(),
  ]);
  await page.getByText("Your decision:").waitFor();

  await switchClientWorkspace(page, member.businessId);
  await page.getByText(memberDecision, { exact: true }).waitFor();
  await page.getByText("Owner or manager decision required").waitFor();
  assert.equal(await page.getByRole("button", { name: "Approve" }).count(), 0);
  await page.getByText("An owner or manager must submit the continue, change or stop decision.").waitFor();
  console.log("CLIENT_OWNER_AND_VIEWER_PERMISSIONS_OK");
}
`;
source = `${source.slice(0, decisionStart)}${decisionReplacement}${source.slice(decisionEnd)}`;

writeFileSync(path, source);
console.log("Prepared live E2E for invitation-verified operator and client registration.");
