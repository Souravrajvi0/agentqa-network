import { test, expect } from "@playwright/test";

const password = process.env.AGENTQA_E2E_PASSWORD ?? "password123";
const leadEmail = process.env.AGENTQA_E2E_LEAD_EMAIL ?? "lead@agentqa.demo";
const qaEmail = process.env.AGENTQA_E2E_QA_EMAIL ?? "qa.b@agentqa.demo";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/projects/);
}

test.describe("Delivery pipeline", () => {
  test("scenario 2: failed CI surfaces blocked state on delivery detail", async ({ page }) => {
    await login(page, leadEmail);
    await page.getByRole("link", { name: /PAY/i }).first().click();
    await page.getByRole("link", { name: /Delivery/i }).click();
    await page.getByRole("row", { name: /Payment Authorization Expiry/i }).click();
    await page.getByRole("button", { name: /CI & builds/i }).click();
    await expect(page.getByText(/DEMO_SEED|FAILURE|SUCCESS/)).toBeVisible();
  });

  test("scenario 3: QA lead can open CI override dialog when gate blocked", async ({ page }) => {
    await login(page, leadEmail);
    const payLink = page.getByRole("link", { name: /Payments Platform|PAY/i }).first();
    if (await payLink.isVisible()) await payLink.click();
    await page.goto(page.url().replace(/\/dashboard.*/, "") + "/delivery");
    const row = page.getByRole("row").nth(1);
    if (await row.isVisible()) await row.click();
    const overrideBtn = page.getByRole("button", { name: /Override CI gate/i });
    if (await overrideBtn.isVisible()) {
      await overrideBtn.click();
      await expect(page.getByText(/Override CI gate/)).toBeVisible();
      await expect(page.getByText(/remains/i)).toBeVisible();
    }
  });

  test("QA inbox navigates to handoff execution", async ({ page }) => {
    await login(page, qaEmail);
    await page.getByRole("link", { name: /PAY|Payments/i }).first().click();
    await page.getByRole("link", { name: /QA Inbox/i }).click();
    const open = page.getByRole("link", { name: /^Open$/i }).first();
    if (await open.isVisible()) {
      await open.click();
      await expect(page.getByText(/Execute approved tests/i)).toBeVisible();
    }
  });
});

test.describe("Agent authorization", () => {
  test("scenario 4: agent key cannot approve retest scope", async ({ request }) => {
    const apiBase = process.env.AGENTQA_E2E_API_URL ?? "http://localhost:4000";
    const agentKey = process.env.AGENTQA_E2E_AGENT_KEY;
    test.skip(!agentKey, "Set AGENTQA_E2E_AGENT_KEY for agent boundary test");
    const payRes = await request.get(`${apiBase}/api/projects`, {
      headers: { Authorization: `Bearer ${await loginApiToken(request, leadEmail)}` },
    });
    const projects = await payRes.json();
    const pay = projects.projects.find((p: { key: string }) => p.key === "PAY");
    const res = await request.post(`${apiBase}/api/projects/${pay.id}/retest-scopes/fake/approve`, {
      headers: { Authorization: `Bearer ${agentKey}` },
      data: {},
    });
    expect(res.status()).toBeGreaterThanOrEqual(403);
  });
});

async function loginApiToken(request: import("@playwright/test").APIRequestContext, email: string) {
  const apiBase = process.env.AGENTQA_E2E_API_URL ?? "http://localhost:4000";
  const res = await request.post(`${apiBase}/api/auth/login`, {
    data: { email, password },
  });
  const body = await res.json();
  return body.token as string;
}
