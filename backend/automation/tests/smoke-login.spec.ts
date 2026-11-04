import { test, expect } from "@playwright/test";

test("smoke login page loads", async ({ page }) => {
  await page.goto("https://example.com");
  await expect(page).toHaveTitle(/Example Domain/);
});
