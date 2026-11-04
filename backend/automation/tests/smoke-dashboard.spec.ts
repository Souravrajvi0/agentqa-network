import { test, expect } from "@playwright/test";

test("smoke dashboard placeholder", async ({ page }) => {
  await page.goto("https://example.com");
  const heading = page.locator("h1");
  await expect(heading).toContainText("Example");
});
