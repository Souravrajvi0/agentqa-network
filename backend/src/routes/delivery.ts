import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireProjectRole, requireUser, requireHumanUser } from "../lib/auth.js";
import {
  getDeliveryDetail,
  getDeliveryPipeline,
  getQaInbox,
} from "../services/deliveryPipeline.js";
import { approveRetestScope, createCiGateOverride, proposeRetestScope } from "../services/retestScope.js";
import { upsertCiRunFromGitHub, mapGitHubWorkflowStatus } from "../services/ciRuns.js";
import { recordDeliveryEvent } from "../services/deliveryTimeline.js";
import { getGitHubIntegrationPublicView } from "../services/githubIntegration.js";
import {
  acceptQaHandoff,
  completeQaHandoff,
  getQaHandoffDetail,
  recordHandoffExecution,
} from "../services/qaHandoffs.js";
import { ConflictError } from "../lib/errors.js";

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
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 25)));
    const data = await getDeliveryPipeline(projectId, { status, ciStatus, blocked, page, pageSize, q });
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

qaInboxRouter.get(
  "/:handoffId",
  asyncHandler(async (req, res) => {
    const { projectId, handoffId } = req.params as { projectId: string; handoffId: string };
    await authProject(req, projectId);
    const detail = await getQaHandoffDetail(projectId, handoffId);
    if (!detail) return res.status(404).json({ error: "Handoff not found" });
    res.json(detail);
  }),
);

qaInboxRouter.post(
  "/:handoffId/accept",
  asyncHandler(async (req, res) => {
    const { projectId, handoffId } = req.params as { projectId: string; handoffId: string };
    const auth = await requireUser(req);
    try {
      const result = await acceptQaHandoff({ projectId, handoffId, userId: auth.userId });
      res.json(result);
    } catch (e) {
      if (e instanceof ConflictError) {
        return res.status(409).json({ error: e.message, code: "CONFLICT" });
      }
      throw e;
    }
  }),
);

qaInboxRouter.post(
  "/:handoffId/executions",
  asyncHandler(async (req, res) => {
    const { projectId, handoffId } = req.params as { projectId: string; handoffId: string };
    const auth = await requireHumanUser(req);
    await requireProjectRole(auth.userId, projectId, ["QA_ENGINEER", "QA_LEAD", "ADMINISTRATOR"]);
    const body = z
      .object({
        testCaseId: z.string(),
        status: z.enum(["PASSED", "FAILED", "BLOCKED", "NOT_RUN"]),
        notes: z.string().optional(),
        actualResults: z.string().optional(),
      })
      .parse(req.body);
    const result = await recordHandoffExecution({
      projectId,
      handoffId,
      userId: auth.userId,
      ...body,
    });
    res.status(201).json(result);
  }),
);

qaInboxRouter.post(
  "/:handoffId/complete",
  asyncHandler(async (req, res) => {
    const { projectId, handoffId } = req.params as { projectId: string; handoffId: string };
    const auth = await requireHumanUser(req);
    await requireProjectRole(auth.userId, projectId, ["QA_ENGINEER", "QA_LEAD", "ADMINISTRATOR"]);
    const result = await completeQaHandoff({ projectId, handoffId, userId: auth.userId });
    res.json(result);
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
    const auth = await requireHumanUser(req);
    await requireProjectRole(auth.userId, projectId, ["QA_LEAD", "ADMINISTRATOR"]);
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
    const auth = await requireHumanUser(req);
    await requireProjectRole(auth.userId, projectId, ["QA_LEAD", "ADMINISTRATOR"]);
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
    const actor = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, email: true },
    });
    res.status(201).json({ override, actor });
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
      metadata: { simulated: true, source: "agentqa_ci_simulate", note: "Not a GitHub webhook" },
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
    const view = await getGitHubIntegrationPublicView({
      projectId,
      host: req.get("host") ?? "localhost",
      protocol: req.protocol,
    });
    res.json(view);
  }),
);

githubIntegrationRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    const auth = await requireHumanUser(req);
    await requireProjectRole(auth.userId, projectId, ["ADMINISTRATOR"]);
    const body = z
      .object({
        owner: z.string().min(1),
        repo: z.string().min(1),
        defaultBranch: z.string().default("main"),
        enabled: z.boolean().default(true),
        webhookSecret: z.string().min(8).optional(),
      })
      .parse(req.body);

    const existing = await prisma.gitHubProjectIntegration.findUnique({ where: { projectId } });
    if (!existing && !body.webhookSecret) {
      return res.status(400).json({ error: "webhookSecret required for new integration", code: "BAD_REQUEST" });
    }

    const integration = await prisma.gitHubProjectIntegration.upsert({
      where: { projectId },
      create: {
        projectId,
        owner: body.owner,
        repo: body.repo,
        defaultBranch: body.defaultBranch,
        enabled: body.enabled,
        webhookSecret: body.webhookSecret!,
      },
      update: {
        owner: body.owner,
        repo: body.repo,
        defaultBranch: body.defaultBranch,
        enabled: body.enabled,
        ...(body.webhookSecret ? { webhookSecret: body.webhookSecret } : {}),
      },
    });
    await recordDeliveryEvent({
      projectId,
      actorUserId: auth.userId,
      kind: "integration.github.updated",
      title: "GitHub integration configured",
      entityType: "GitHubProjectIntegration",
      entityId: integration.id,
    });
    const view = await getGitHubIntegrationPublicView({
      projectId,
      host: req.get("host") ?? "localhost",
      protocol: req.protocol,
    });
    res.json({ ok: true, ...view });
  }),
);

githubIntegrationRouter.post(
  "/rotate-secret",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    const auth = await requireHumanUser(req);
    await requireProjectRole(auth.userId, projectId, ["ADMINISTRATOR"]);
    const body = z.object({ webhookSecret: z.string().min(8) }).parse(req.body);
    const existing = await prisma.gitHubProjectIntegration.findUnique({ where: { projectId } });
    if (!existing) return res.status(404).json({ error: "Integration not configured" });
    await prisma.gitHubProjectIntegration.update({
      where: { projectId },
      data: { webhookSecret: body.webhookSecret },
    });
    await recordDeliveryEvent({
      projectId,
      actorUserId: auth.userId,
      kind: "integration.github.secret_rotated",
      title: "GitHub webhook secret rotated",
      entityType: "GitHubProjectIntegration",
      entityId: existing.id,
    });
    res.json({ ok: true, secretConfigured: true });
  }),
);

export const switchRunnerRouter = Router({ mergeParams: true });

switchRunnerRouter.post(
  "/heartbeat",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params as { projectId: string };
    const token = req.headers["x-switch-runner-token"];
    const expected = process.env.SWITCH_RUNNER_TOKEN;
    if (!expected || token !== expected) {
      return res.status(401).json({ error: "Invalid runner token", code: "UNAUTHORIZED" });
    }
    const body = z.object({ runnerLabel: z.string().optional() }).parse(req.body ?? {});
    await prisma.switchRunnerHeartbeat.upsert({
      where: { projectId },
      create: { projectId, runnerLabel: body.runnerLabel, lastSeenAt: new Date() },
      update: { runnerLabel: body.runnerLabel, lastSeenAt: new Date() },
    });
    res.json({ ok: true });
  }),
);
