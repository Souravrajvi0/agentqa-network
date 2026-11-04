import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireProjectRole, requireUser } from "../lib/auth.js";
import {
  getDeliveryDetail,
  getDeliveryPipeline,
  getQaInbox,
} from "../services/deliveryPipeline.js";
import { approveRetestScope, createCiGateOverride, proposeRetestScope } from "../services/retestScope.js";
import { upsertCiRunFromGitHub, mapGitHubWorkflowStatus } from "../services/ciRuns.js";
import { recordDeliveryEvent } from "../services/deliveryTimeline.js";

async function authProject(req: Parameters<typeof requireUser>[0], projectId: string) {
  const auth = await requireUser(req);
  await requireProjectRole(auth.userId, projectId, [
    "ADMINISTRATOR",
    "QA_LEAD",
    "QA_ENGINEER",
    "DEVELOPER",
    "VIEWER",
  ]);
  return auth;
}

export const deliveryRouter = Router({ mergeParams: true });

deliveryRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    await authProject(req, projectId);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const ciStatus = typeof req.query.ciStatus === "string" ? req.query.ciStatus : undefined;
    const blocked = req.query.blocked === "true";
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 25)));
    const data = await getDeliveryPipeline(projectId, { status, ciStatus, blocked, page, pageSize });
    res.json(data);
  }),
);

deliveryRouter.get(
  "/:changeId",
  asyncHandler(async (req, res) => {
    const { projectId, changeId } = req.params as { projectId: string; changeId: string };
    await authProject(req, projectId);
    const detail = await getDeliveryDetail(projectId, changeId);
    if (!detail) return res.status(404).json({ error: "Change not found" });
    res.json(detail);
  }),
);

export const qaInboxRouter = Router({ mergeParams: true });

qaInboxRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    await authProject(req, projectId);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const data = await getQaInbox(projectId, status);
    res.json(data);
  }),
);

qaInboxRouter.post(
  "/:handoffId/accept",
  asyncHandler(async (req, res) => {
    const { projectId, handoffId } = req.params as { projectId: string; handoffId: string };
    const auth = await requireUser(req);
    await requireProjectRole(auth.userId, projectId, ["QA_ENGINEER", "QA_LEAD", "ADMINISTRATOR"]);
    const handoff = await prisma.qAHandoff.findFirst({
      where: { id: handoffId, projectId },
    });
    if (!handoff) return res.status(404).json({ error: "Handoff not found" });
    const updated = await prisma.qAHandoff.update({
      where: { id: handoffId },
      data: { status: "ACCEPTED", assignedToUserId: auth.userId, acceptedAt: new Date() },
    });
    res.json({ handoff: updated });
  }),
);

export const retestRouter = Router({ mergeParams: true });

retestRouter.post(
  "/propose",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    const auth = await requireUser(req);
    await requireProjectRole(auth.userId, projectId, ["DEVELOPER", "ADMINISTRATOR"]);
    const body = z
      .object({
        changeId: z.string(),
        testCaseIds: z.array(z.string()),
        description: z.string().optional(),
        buildId: z.string().optional(),
      })
      .parse(req.body);
    const scope = await proposeRetestScope({ ...body, projectId, userId: auth.userId });
    res.status(201).json({ scope });
  }),
);

retestRouter.post(
  "/:scopeId/approve",
  asyncHandler(async (req, res) => {
    const { projectId, scopeId } = req.params as { projectId: string; scopeId: string };
    const auth = await requireUser(req);
    const body = z.object({ testCaseIds: z.array(z.string()).optional() }).parse(req.body ?? {});
    const result = await approveRetestScope({
      projectId,
      scopeId,
      leadUserId: auth.userId,
      testCaseIds: body.testCaseIds,
    });
    res.json(result);
  }),
);

export const ciRouter = Router({ mergeParams: true });

ciRouter.post(
  "/overrides",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    const auth = await requireUser(req);
    const body = z
      .object({
        ciRunId: z.string(),
        reason: z.string().min(3),
        developerChangeId: z.string().optional(),
        buildId: z.string().optional(),
      })
      .parse(req.body);
    const override = await createCiGateOverride({
      projectId,
      actorUserId: auth.userId,
      ...body,
    });
    res.status(201).json({ override });
  }),
);

ciRouter.post(
  "/simulate",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    const auth = await requireUser(req);
    await requireProjectRole(auth.userId, projectId, ["ADMINISTRATOR", "DEVELOPER", "QA_LEAD"]);
    const body = z
      .object({
        workflowName: z.string().default("ci.yml"),
        conclusion: z.enum(["SUCCESS", "FAILURE"]),
        changeId: z.string().optional(),
        commitSha: z.string().optional(),
      })
      .parse(req.body);
    const mapped = mapGitHubWorkflowStatus("completed", body.conclusion.toLowerCase());
    const run = await upsertCiRunFromGitHub({
      projectId,
      repository: "demo/local",
      externalRunId: `sim-${Date.now()}`,
      workflowName: body.workflowName,
      commitSha: body.commitSha,
      status: mapped.status,
      conclusion: mapped.conclusion,
      completedAt: new Date(),
      metadata: { simulated: true },
    });
    if (body.changeId) {
      await prisma.ciRun.update({ where: { id: run.id }, data: { developerChangeId: body.changeId } });
    }
    res.json({ ciRun: run });
  }),
);

export const githubIntegrationRouter = Router({ mergeParams: true });

githubIntegrationRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    await authProject(req, projectId);
    const integration = await prisma.gitHubProjectIntegration.findUnique({ where: { projectId } });
    if (!integration) return res.json({ integration: null });
    res.json({
      integration: {
        owner: integration.owner,
        repo: integration.repo,
        defaultBranch: integration.defaultBranch,
        enabled: integration.enabled,
        webhookUrl: `${req.protocol}://${req.get("host")}/api/integrations/github/webhook`,
      },
    });
  }),
);

githubIntegrationRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    const auth = await requireUser(req);
    await requireProjectRole(auth.userId, projectId, ["ADMINISTRATOR"]);
    const body = z
      .object({
        owner: z.string(),
        repo: z.string(),
        webhookSecret: z.string().min(8),
        defaultBranch: z.string().default("main"),
      })
      .parse(req.body);
    const integration = await prisma.gitHubProjectIntegration.upsert({
      where: { projectId },
      create: { projectId, ...body },
      update: { owner: body.owner, repo: body.repo, webhookSecret: body.webhookSecret, defaultBranch: body.defaultBranch },
    });
    await recordDeliveryEvent({
      projectId,
      actorUserId: auth.userId,
      kind: "integration.github.updated",
      title: "GitHub integration configured",
      entityType: "GitHubProjectIntegration",
      entityId: integration.id,
    });
    res.json({ ok: true });
  }),
);
