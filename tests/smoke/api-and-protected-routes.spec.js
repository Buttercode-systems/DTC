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

  test("unknown report token is handled as a safe not-found response", async ({ page }) => {
    const response = await page.goto(`/report/not-a-real-token-${Date.now()}`);

    // Next.js may return HTTP 200 for a streamed notFound() boundary even though
    // the rendered document is the framework's 404 page. Verify the user-facing
    // and indexing-safe contract rather than coupling the test to streaming mode.
    expect([200, 404]).toContain(response?.status());
    await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
    await expect(page.locator("body")).toContainText(/not found|could not be found/i);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i
    );
    await expect(page.locator("main, body")).not.toContainText(/execution report|invoice|customer|lead details/i);
  });

  for (const route of ["/app", "/app/import", "/app/automation", "/app/admin"]) {
    test(`protected route ${route} requires sign in`, async ({ page }) => {
      await page.goto(route);

      await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();
      expect(page.url()).toContain("/login");
    });
  }
});
