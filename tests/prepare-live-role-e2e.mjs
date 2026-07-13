import { readFileSync, writeFileSync } from "node:fs";

const path = "tests/tad-live-role-e2e.mjs";
let source = readFileSync(path, "utf8");
const start = source.indexOf("async function clientDecisionAndReport(");
const end = source.indexOf("\nasync function testManagedRouteRestrictions", start);
if (start < 0 || end < 0) throw new Error("Could not locate clientDecisionAndReport");

const replacement = `async function switchClientWorkspace(page, businessId) {
  await page.goto(\\`\${appUrl}/app/service\\`, { waitUntil: "networkidle" });
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

source = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
writeFileSync(path, source);
console.log("Prepared live E2E workspace navigation.");
