import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const runId = String(process.env.E2E_RUN_ID || Date.now()).replace(/[^A-Za-z0-9_-]/g, "");
const appUrl = process.env.E2E_APP_URL || "https://due-today-git-feature-full-production-5884b8-ramatsies-projects.vercel.app";
const tadUrl = process.env.E2E_TAD_URL || "https://the-admin-department.vercel.app";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(supabaseUrl && anonKey, "Supabase public configuration is required");

const operatorEmail = `ramatsienkoanyane07+tad-e2e-${runId}-operator@gmail.com`;
const clientEmail = `ramatsienkoanyane07+tad-e2e-${runId}-client@gmail.com`;
const operatorPassword = `Tad!${randomBytes(24).toString("base64url")}`;
const clientPassword = `Client!${randomBytes(24).toString("base64url")}`;
console.log(`::add-mask::${operatorPassword}`);
console.log(`::add-mask::${clientPassword}`);
console.log(`E2E_RUN_ID=${runId}`);
console.log(`E2E_OPERATOR_EMAIL=${operatorEmail}`);
console.log(`E2E_CLIENT_EMAIL=${clientEmail}`);

const departments = [
  { key: "invoice", page: "invoice-admin-service.html", label: "Invoice Admin", problem: "missing_information", viewer: false },
  { key: "sales", page: "sales-admin-service.html", label: "Sales Admin", problem: "missed", viewer: false },
  { key: "client", page: "client-admin-service.html", label: "Client Admin", problem: "missing_documents", viewer: false },
  { key: "property", page: "property-admin-service.html", label: "Property Admin", problem: "lost_requests", viewer: false },
  { key: "practice", page: "practice-admin-service.html", label: "Practice / Booking Admin", problem: "booking_gaps", viewer: false },
  { key: "member", page: "member-admin-service.html", label: "Member Admin", problem: "attendance_risk", viewer: true },
];
for (const department of departments) {
  department.business = `TAD E2E ${runId} ${department.label}`;
  department.record = `${department.label} live record ${runId}`;
}

const resultDir = "test-results/tad-live-e2e";
mkdirSync(resultDir, { recursive: true });
const state = { runId, operatorEmail, clientEmail, appUrl, businesses: [], invitations: [] };
const saveState = () => writeFileSync(`${resultDir}/state.json`, JSON.stringify(state, null, 2));
saveState();

const auth = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function signupOperator() {
  const { error } = await auth.auth.signUp({
    email: operatorEmail,
    password: operatorPassword,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/hq")}`,
      data: { e2e_run_id: runId, e2e_role: "operator" },
    },
  });
  if (error && !error.message.toLowerCase().includes("already registered")) throw error;
  console.log("WAITING_OPERATOR_CONFIRMATION");
}

async function waitForPasswordSession(email, password, label, timeoutMs = 12 * 60_000) {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (data.session) {
      await client.auth.signOut();
      console.log(`${label}_CONFIRMED`);
      return;
    }
    lastError = error?.message || "session_not_ready";
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }
  throw new Error(`${label} confirmation timed out: ${lastError}`);
}

async function login(page, email, password, next) {
  await page.goto(`${appUrl}/login?next=${encodeURIComponent(next)}`, { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
}

async function waitForOperatorAccess(page) {
  const started = Date.now();
  while (Date.now() - started < 10 * 60_000) {
    await login(page, operatorEmail, operatorPassword, "/hq");
    if (page.url().includes("/ops") && !page.url().includes("/denied")) {
      await page.getByText("Run every client from one control room.").waitFor();
      console.log("OPERATOR_ACCESS_CONFIRMED");
      return;
    }
    console.log("WAITING_OPERATOR_ROLE");
    await page.context().clearCookies();
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }
  throw new Error("Operator role was not granted in time");
}

async function fillPublicApplication(page, department) {
  await page.goto(`${tadUrl}/${department.page}`, { waitUntil: "networkidle" });
  assert.ok((await page.title()).includes(department.label));
  const form = page.locator("#admin-service-application");
  await form.locator('input[name="business"]').fill(department.business);
  await form.locator('input[name="contact"]').fill("TAD E2E Client");
  await form.locator('input[name="email"]').fill(clientEmail);
  await form.locator('select[name="active_records"]').selectOption("20");
  await form.locator('select[name="workflow_problem"]').selectOption(department.problem);
  await form.locator('input[name="tools"]').fill("Email, WhatsApp and spreadsheets");
  await form.locator('textarea[name="outcome"]').fill(`Every ${department.label} record must have a visible owner, next action and date.`);
  await form.locator('input[name="owner_available"]').check();
  await form.locator('input[name="data_authority"]').check();
  await form.locator('input[name="boundary_accepted"]').check();
  await page.waitForTimeout(2700);
  await page.getByRole("button", { name: "Check readiness" }).click();
  await page.getByText("Ready to submit for private review").waitFor();
  await page.getByRole("button", { name: "Submit application securely" }).click();
  const status = page.locator("#submission-status");
  await status.getByText(/Application received\. Reference/).waitFor({ timeout: 30_000 });
  const text = await status.innerText();
  assert.match(text, /Reference [A-F0-9]{8}/);
  console.log(`PUBLIC_APPLICATION_OK:${department.key}`);
}

async function saveApplicationReview(page, department) {
  await page.goto(`${appUrl}/ops/applications`, { waitUntil: "networkidle" });
  let card = page.locator("article").filter({ hasText: department.business });
  await card.waitFor();
  await card.locator('select[name="status"]').selectOption("qualified");
  await card.locator('select[name="commercial_decision"]').selectOption("accepted");
  await card.locator('select[name="payment_status"]').selectOption("waived");
  await card.locator('input[name="payment_reference"]').fill(`E2E-${runId}`);
  const scope = card.locator('input[name="scope_accepted"]');
  if (!(await scope.isChecked())) await scope.check();
  await card.locator('textarea[name="qualification_notes"]').fill("Controlled full-role E2E verification.");
  await Promise.all([
    page.waitForLoadState("networkidle"),
    card.getByRole("button", { name: "Save review" }).click(),
  ]);

  card = page.locator("article").filter({ hasText: department.business });
  const create = card.getByRole("button", { name: new RegExp(`Create ${department.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} workspace`) });
  await create.waitFor();
  await Promise.all([page.waitForLoadState("networkidle"), create.click()]);
  assert.match(page.url(), /\/ops\/client\/[0-9a-f-]+\/access/);
  department.businessId = page.url().match(/\/ops\/client\/([^/]+)\/access/)?.[1];
  assert.ok(department.businessId);
  state.businesses.push({ department: department.key, id: department.businessId, name: department.business });
  saveState();
}

async function createInvitation(page, department) {
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Create Client Portal invitation" }) });
  await form.locator('input[name="email"]').fill(clientEmail);
  await form.locator('select[name="role"]').selectOption(department.viewer ? "viewer" : "owner");
  await form.getByRole("button", { name: "Create Client Portal invitation" }).click();
  const invitationInput = page.getByLabel("Client Portal invitation link");
  await invitationInput.waitFor({ timeout: 20_000 });
  department.invitation = await invitationInput.inputValue();
  assert.ok(department.invitation.includes("/portal/accept?token="));
  state.invitations.push({ department: department.key, role: department.viewer ? "viewer" : "owner", url: department.invitation });
  saveState();
}

async function createWorkflowRecord(page, department) {
  await page.getByRole("link", { name: "Open workflow" }).click();
  await page.waitForLoadState("networkidle");
  assert.ok(page.url().includes(`/ops/client/${department.businessId}`));
  if (department.key === "practice") await page.getByText("Protected workflow.").waitFor();

  const details = page.locator("details").filter({ hasText: `Add ${department.label} record` });
  await details.locator("summary").click();
  const form = details.locator("form");
  await form.locator('input[name="title"]').fill(department.record);
  await form.locator('input[name="assigned_name"]').fill("E2E Operator");
  await form.locator('input[name="next_action"]').fill("Complete controlled verification");
  await form.locator('input[name="due_date"]').fill(new Date().toISOString().slice(0, 10));

  for (const input of await form.locator('input[required]:not([type="hidden"])').all()) {
    if (await input.inputValue()) continue;
    const type = await input.getAttribute("type");
    if (type === "number") await input.fill("100");
    else if (type === "date") await input.fill(new Date().toISOString().slice(0, 10));
    else if (type === "url") await input.fill("https://example.com/e2e-proof");
    else if (type === "email") await input.fill(clientEmail);
    else await input.fill("E2E verified value");
  }
  for (const select of await form.locator("select[required]").all()) {
    const options = await select.locator("option").evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, disabled: node.disabled })));
    const option = options.find((item) => item.value && !item.disabled);
    if (option) await select.selectOption(option.value);
  }

  await Promise.all([
    page.waitForLoadState("networkidle"),
    form.getByRole("button", { name: "Create workflow record" }).click(),
  ]);
  await page.getByText(department.record, { exact: true }).waitFor();
  console.log(`OPERATOR_WORKFLOW_OK:${department.key}`);
}

async function createDecision(page, department, title) {
  await page.goto(`${appUrl}/ops`, { waitUntil: "networkidle" });
  const details = page.locator("details").filter({ hasText: "Request a decision" });
  await details.locator("summary").click();
  const form = details.locator("form");
  await form.locator('select[name="business_id"]').selectOption({ label: department.business });
  await form.locator('input[name="title"]').fill(title);
  await form.locator('textarea[name="detail"]').fill("Controlled E2E decision request.");
  await form.locator('input[name="amount"]').fill("250");
  await Promise.all([
    page.waitForLoadState("networkidle"),
    form.getByRole("button", { name: "Add approval request" }).click(),
  ]);
  await page.getByText(title, { exact: true }).waitFor();
}

async function generateReport(page, department) {
  await page.goto(`${appUrl}/ops`, { waitUntil: "networkidle" });
  const card = page.locator("article").filter({ hasText: department.business });
  await Promise.all([
    page.waitForLoadState("networkidle"),
    card.getByRole("button", { name: "Generate report" }).click(),
  ]);
  console.log(`OPERATOR_REPORT_OK:${department.key}`);
}

async function assertInvitationEmailMismatch(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Accept invitation and open Client Portal" }).click();
  await page.getByText("This invitation belongs to a different email address").waitFor();
  console.log("INVITATION_EMAIL_MISMATCH_OK");
}

async function createClientAccount(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Create client account" }).click();
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="passphrase"]').fill(clientPassword);
  await page.getByRole("button", { name: "Create Client Portal account" }).click();
  await page.getByText(/Check your email to confirm the account|Opening your workspace/).waitFor({ timeout: 30_000 });
  console.log("WAITING_CLIENT_CONFIRMATION");
}

async function claimInvitation(page, department, first = false) {
  if (first) {
    await login(page, clientEmail, clientPassword, new URL(department.invitation).pathname + new URL(department.invitation).search);
  } else {
    await page.goto(department.invitation, { waitUntil: "networkidle" });
  }
  await page.getByRole("button", { name: "Accept invitation and open Client Portal" }).click();
  await page.getByRole("heading", { name: "Your Service Desk" }).waitFor({ timeout: 30_000 });
  await page.getByText(department.label, { exact: true }).waitFor();
  console.log(`CLIENT_PORTAL_OK:${department.key}:${department.viewer ? "viewer" : "owner"}`);
}

async function clientDecisionAndReport(page, invoice, member, invoiceDecision, memberDecision) {
  await page.goto(invoice.invitation, { waitUntil: "networkidle" });
  if (page.getByRole("button", { name: "Accept invitation and open Client Portal" })) {
    // Already claimed links render unavailable; active business is switched through claim sequence below.
  }
  // The first claimed workspace may not be active after all claims. Use the workspace switcher.
  const switcher = page.locator('select[name="business_id"]');
  if (await switcher.count()) {
    await switcher.selectOption(invoice.businessId);
    await page.waitForLoadState("networkidle");
  } else {
    await page.goto(`${appUrl}/app/service`, { waitUntil: "networkidle" });
  }
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

  const businessSwitcher = page.locator('select[name="business_id"]');
  await businessSwitcher.selectOption(member.businessId);
  await page.waitForLoadState("networkidle");
  await page.getByText(memberDecision, { exact: true }).waitFor();
  await page.getByText("Owner or manager decision required").waitFor();
  assert.equal(await page.getByRole("button", { name: "Approve" }).count(), 0);
  await page.getByText("An owner or manager must submit the continue, change or stop decision.").waitFor();
  console.log("CLIENT_OWNER_AND_VIEWER_PERMISSIONS_OK");
}

async function testManagedRouteRestrictions(page) {
  for (const route of ["leads", "quotes", "invoices", "customers", "import", "settings", "pipeline", "report"]) {
    await page.goto(`${appUrl}/app/${route}`, { waitUntil: "networkidle" });
    assert.ok(page.url().includes("/app/service"), `managed client route ${route} must redirect to Service Desk`);
  }
  await page.goto(`${appUrl}/ops`, { waitUntil: "networkidle" });
  assert.ok(page.url().includes("/ops/denied"));
  console.log("CLIENT_ROUTE_BOUNDARIES_OK");
}

await signupOperator();
await waitForPasswordSession(operatorEmail, operatorPassword, "OPERATOR");

const browser = await chromium.launch({ headless: true });
const operatorContext = await browser.newContext();
const operatorPage = await operatorContext.newPage();
const clientContext = await browser.newContext();
const clientPage = await clientContext.newPage();

try {
  await waitForOperatorAccess(operatorPage);

  for (const department of departments) await fillPublicApplication(operatorPage, department);
  for (const department of departments) {
    await saveApplicationReview(operatorPage, department);
    await createInvitation(operatorPage, department);
    await createWorkflowRecord(operatorPage, department);
  }

  const invoice = departments[0];
  const member = departments[5];
  const invoiceDecision = `Approve invoice exception ${runId}`;
  const memberDecision = `Approve member exception ${runId}`;
  await createDecision(operatorPage, invoice, invoiceDecision);
  await createDecision(operatorPage, member, memberDecision);
  await generateReport(operatorPage, invoice);
  await generateReport(operatorPage, member);
  await assertInvitationEmailMismatch(operatorPage, invoice.invitation);

  await createClientAccount(clientPage, invoice.invitation);
  await waitForPasswordSession(clientEmail, clientPassword, "CLIENT");
  await claimInvitation(clientPage, invoice, true);
  for (const department of departments.slice(1)) await claimInvitation(clientPage, department);
  await clientDecisionAndReport(clientPage, invoice, member, invoiceDecision, memberDecision);
  await testManagedRouteRestrictions(clientPage);

  await operatorPage.goto(`${appUrl}/ops`, { waitUntil: "networkidle" });
  await operatorPage.getByText("Continue after successful E2E verification.", { exact: true }).waitFor();
  await operatorPage.goto(`${appUrl}/ops/access`, { waitUntil: "networkidle" });
  await operatorPage.getByText(clientEmail, { exact: true }).first().waitFor();
  console.log("OPERATOR_CLIENT_RESPONSE_AND_ACCESS_OK");

  await operatorPage.screenshot({ path: `${resultDir}/operator-admin-hq.png`, fullPage: true });
  await clientPage.goto(`${appUrl}/app/service`, { waitUntil: "networkidle" });
  await clientPage.screenshot({ path: `${resultDir}/client-portal.png`, fullPage: true });
  state.completed = true;
  saveState();
  console.log("FULL_TAD_OPERATOR_CLIENT_E2E_PASSED");
} catch (error) {
  state.error = error instanceof Error ? error.message : String(error);
  saveState();
  await operatorPage.screenshot({ path: `${resultDir}/operator-failure.png`, fullPage: true }).catch(() => {});
  await clientPage.screenshot({ path: `${resultDir}/client-failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
