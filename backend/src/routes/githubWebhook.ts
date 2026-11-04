import crypto from "crypto";
import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { mapGitHubWorkflowStatus, upsertCiRunFromGitHub } from "../services/ciRuns.js";
import { registerWebhookDelivery } from "../services/webhookDeliveries.js";
import { markGitHubWebhookReceived } from "../services/githubIntegration.js";

export function verifyGitHubSignature(secret: string, rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = signatureHeader.slice("sha256=".length);
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const githubWebhookRouter = Router();

githubWebhookRouter.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const rawBody = req.body as Buffer;
    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).json({ error: "Raw body required", code: "BAD_REQUEST" });
    }

    const deliveryId = req.headers["x-github-delivery"] as string | undefined;
    const event = req.headers["x-github-event"] as string | undefined;
    const signature = req.headers["x-hub-signature-256"] as string | undefined;

    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid JSON", code: "BAD_REQUEST" });
    }

    const repoFull = payload.repository?.full_name as string | undefined;
    if (!repoFull) {
      return res.status(202).json({ ignored: true, reason: "no repository" });
    }

    const [owner, repo] = repoFull.split("/");
    const integration = await prisma.gitHubProjectIntegration.findFirst({
      where: { owner, repo, enabled: true },
    });
    if (!integration) {
      return res.status(202).json({ ignored: true, reason: "unknown repository" });
    }

    if (!verifyGitHubSignature(integration.webhookSecret, rawBody, signature)) {
      await markGitHubWebhookReceived(integration.projectId, false, "Invalid signature");
      return res.status(401).json({ error: "Invalid signature", code: "UNAUTHORIZED" });
    }

    if (deliveryId) {
      const { duplicate } = await registerWebhookDelivery({
        provider: "GITHUB",
        deliveryId,
        projectId: integration.projectId,
      });
      if (duplicate) {
        return res.json({ ok: true, deduplicated: true });
      }
    }

    if (event !== "workflow_run") {
      return res.json({ ok: true, ignored: event });
    }

    const run = payload.workflow_run;
    if (!run?.id) return res.status(400).json({ error: "Missing workflow_run", code: "BAD_REQUEST" });

    const mapped = mapGitHubWorkflowStatus(run.status, run.conclusion);
    await upsertCiRunFromGitHub({
      projectId: integration.projectId,
      repository: repoFull,
      externalRunId: String(run.id),
      deliveryId,
      workflowName: run.name ?? payload.workflow?.name ?? "workflow",
      workflowUrl: run.html_url,
      branch: run.head_branch ?? undefined,
      commitSha: run.head_sha ?? undefined,
      status: mapped.status,
      conclusion: mapped.conclusion,
      startedAt: run.run_started_at ? new Date(run.run_started_at) : undefined,
      completedAt: run.updated_at ? new Date(run.updated_at) : undefined,
      metadata: { runNumber: run.run_number, event: payload.action, source: "github_webhook" },
    });

    await markGitHubWebhookReceived(integration.projectId, true);

    res.json({ ok: true });
  }),
);
