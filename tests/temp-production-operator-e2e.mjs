import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const baseUrl = "https://due-today-six.vercel.app";
const email = "buttercoder.dev+tad-e2e-7131255@gmail.com";
const password = "TadE2E!mOT2VxGT1QUpWa10id";
const resultDir = "test-results/operator-e2e";
mkdirSync(resultDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(`${baseUrl}/signup`, { waitUntil: "networkidle" });
  await page.locator('input[name="business_name"]').fill("TAD E2E Verification");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Create my Today list" }).click();
  await page.waitForTimeout(3000);

  const url = page.url();
  const body = await page.locator("body").innerText();
  writeFileSync(`${resultDir}/signup-body.txt`, body);
  writeFileSync(`${resultDir}/signup-result.json`, JSON.stringify({ url, email }, null, 2));
  await page.screenshot({ path: `${resultDir}/signup.png`, fullPage: true });

  const created =
    url.includes("/app") ||
    body.includes("Check your email to confirm your account") ||
    body.toLowerCase().includes("already registered");

  assert.equal(created, true, `Signup did not create or recognise the test account. URL=${url} BODY=${body}`);
  console.log(JSON.stringify({ phase: "signup", url, created: true, email }));
} finally {
  await browser.close();
}
