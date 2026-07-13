import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const baseUrl = "https://due-today-six.vercel.app";
const email = "tad-e2e-606b3ee2b6@example.invalid";
const password = "TadE2E!mOT2VxGT1QUpWa10id";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(`${baseUrl}/signup`, { waitUntil: "networkidle" });
  await page.locator('input[name="business_name"]').fill("TAD E2E Verification");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Create my Today list" }).click();
  await page.waitForTimeout(2500);

  const url = page.url();
  const body = await page.locator("body").innerText();
  const created =
    url.includes("/app") ||
    body.includes("Check your email to confirm your account") ||
    body.includes("already registered");

  assert.equal(created, true, `Signup did not create or recognise the test account. URL=${url} BODY=${body}`);
  console.log(JSON.stringify({ phase: "signup", url, created: true }));
} finally {
  await browser.close();
}
