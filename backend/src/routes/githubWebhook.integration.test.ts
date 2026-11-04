import crypto from "crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { verifyGitHubSignature } from "../routes/githubWebhook.js";

const runIntegration =
  process.env.AGENTQA_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);

function signPayload(secret: string, body: string) {
  const digest = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

describe.runIf(runIntegration)("GitHub webhook integration", () => {
  const app = createApp();

  it("rejects invalid signature", async () => {
    const body = JSON.stringify({ repository: { full_name: "demo/payments-api" } });
    const res = await request(app)
      .post("/api/integrations/github/webhook")
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", "sha256=invalid")
      .set("X-GitHub-Event", "workflow_run")
      .send(body);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("accepts valid signature and deduplicates delivery id", async () => {
    const integration = await prisma.gitHubProjectIntegration.findFirst({
      where: { owner: "demo", repo: "payments-api" },
    });
    expect(integration).toBeTruthy();

    const payload = {
      repository: { full_name: "demo/payments-api" },
      workflow_run: {
        id: 99001,
        name: "ci.yml",
        head_branch: "feature/test-webhook",
        head_sha: "webhook-test-sha",
        status: "completed",
        conclusion: "success",
        run_number: 42,
        html_url: "https://example.com/run/99001",
        run_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      action: "completed",
    };
    const body = JSON.stringify(payload);
    const deliveryId = `test-delivery-${Date.now()}`;
    const headers = {
      "X-Hub-Signature-256": signPayload(integration!.webhookSecret, body),
      "X-GitHub-Event": "workflow_run",
      "X-GitHub-Delivery": deliveryId,
    };

    const first = await request(app)
      .post("/api/integrations/github/webhook")
      .set("X-Hub-Signature-256", headers["X-Hub-Signature-256"])
      .set("X-GitHub-Event", "workflow_run")
      .set("X-GitHub-Delivery", deliveryId)
      .set("Content-Type", "application/json")
      .send(body);
    expect(first.status).toBe(200);
    expect(first.body.ok).toBe(true);

    const deliveryRows = await prisma.inboundWebhookDelivery.count({
      where: { provider: "GITHUB", deliveryId },
    });
    expect(deliveryRows).toBe(1);

    const second = await request(app)
      .post("/api/integrations/github/webhook")
      .set("X-Hub-Signature-256", headers["X-Hub-Signature-256"])
      .set("X-GitHub-Event", "workflow_run")
      .set("X-GitHub-Delivery", deliveryId)
      .set("Content-Type", "application/json")
      .send(body);
    expect(second.status).toBe(200);
    expect(second.body.deduplicated).toBe(true);

    const count = await prisma.ciRun.count({
      where: { externalRunId: "99001", projectId: integration!.projectId },
    });
    expect(count).toBe(1);
  });

  it("ignores unknown repository", async () => {
    const body = JSON.stringify({ repository: { full_name: "unknown/repo" } });
    const res = await request(app)
      .post("/api/integrations/github/webhook")
      .set("Content-Type", "application/json")
      .set("X-GitHub-Event", "workflow_run")
      .send(Buffer.from(body));
    expect(res.status).toBe(202);
  });
});

describe("verifyGitHubSignature", () => {
  it("validates using exported helper", () => {
    const secret = "s3cret";
    const raw = Buffer.from("{}");
    const sig = signPayload(secret, raw.toString());
    expect(verifyGitHubSignature(secret, raw, sig)).toBe(true);
  });
});
