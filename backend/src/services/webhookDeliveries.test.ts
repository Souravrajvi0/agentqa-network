import { describe, expect, it } from "vitest";
import { registerWebhookDelivery } from "./webhookDeliveries.js";

const runIntegration =
  process.env.AGENTQA_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);

describe.runIf(runIntegration)("registerWebhookDelivery", () => {
  it("marks duplicate delivery ids", async () => {
    const id = `unit-delivery-${Date.now()}`;
    const first = await registerWebhookDelivery({ provider: "GITHUB", deliveryId: id });
    expect(first.duplicate).toBe(false);
    const second = await registerWebhookDelivery({ provider: "GITHUB", deliveryId: id });
    expect(second.duplicate).toBe(true);
  });
});
