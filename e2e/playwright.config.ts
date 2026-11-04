import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.AGENTQA_E2E_BASE_URL ?? "http://localhost:5170";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.AGENTQA_E2E_NO_SERVER
    ? undefined
    : {
        command: "npm run dev -w backend & npm run dev -w frontend",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
