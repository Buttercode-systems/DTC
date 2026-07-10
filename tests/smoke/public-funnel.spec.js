const { test, expect } = require("@playwright/test");

test.describe("public funnel smoke", () => {
  test("landing page loads and links to the assessment", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Find what's stuck/i })).toBeVisible();
    await expect(page.getByText(/Business Execution OS/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Start the free assessment|Free assessment/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /Start the free assessment|Free assessment/i }).first().click();
    await expect(page).toHaveURL(/\/assessment$/);
    await expect(page.getByRole("heading", { name: /Two things about your business/i })).toBeVisible();
  });

  test("assessment profile step can start after selecting business profile", async ({ page }) => {
    await page.goto("/assessment");

    await page.getByRole("button", { name: "Trades & construction" }).click();
    await page.getByRole("button", { name: "2–5 people" }).click();
    await page.getByRole("button", { name: "Start the assessment" }).click();

    await expect(page.getByText(/Job 1 of 7/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Getting customers/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Next job/i })).toBeDisabled();
  });

  test("trust and early access pages load", async ({ page }) => {
    const pages = [
      { path: "/early-access", text: /early access|tester/i },
      { path: "/privacy", text: /privacy/i },
      { path: "/terms", text: /terms/i },
    ];

    for (const target of pages) {
      await page.goto(target.path);
      await expect(page.locator("body")).toContainText(target.text);
    }
  });
});
