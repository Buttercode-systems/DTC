const { test, expect } = require("@playwright/test");

test.describe("API and protected route smoke", () => {
  test("assessment API rejects invalid submissions safely", async ({ request }) => {
    const response = await request.post("/api/assessment", {
      data: {
        answers: {},
        industry: "not-real",
        team_size: "not-real",
        lead: { full_name: "", email: "not-an-email" },
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toEqual(expect.any(String));
  });

  test("unknown report token returns not found", async ({ page }) => {
    const response = await page.goto(`/report/not-a-real-token-${Date.now()}`);

    expect(response?.status()).toBe(404);
    await expect(page.locator("body")).toContainText(/404|not found|could not be found/i);
  });

  for (const route of ["/app", "/app/import", "/app/automation", "/app/admin"]) {
    test(`protected route ${route} requires sign in`, async ({ page }) => {
      await page.goto(route);

      await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();
      expect(page.url()).toContain("/login");
    });
  }
});
