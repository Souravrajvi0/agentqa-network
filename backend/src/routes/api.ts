import type { Prisma } from "@prisma/client";
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireProjectRole, requireUser, resolveAuth } from "../lib/auth.js";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import { refreshCyclePriorities, getPrioritizedQueue } from "../services/prioritization.js";
import { claimAssignment, releaseAssignment } from "../services/assignments.js";
import { runAutomatedTest } from "../services/playwrightRunner.js";
import { notifyProjectLeads, createNotification } from "../services/notifications.js";
import { notifySwitchCollaboration } from "../services/switch.js";
import { recordAudit } from "../services/audit.js";
import { publishProjectEvent } from "../ws/hub.js";
import {
  generateAgentApiKey,
  hashAgentKey,
  requireUser as requireUserAuth,
} from "../lib/auth.js";

export const apiRouter = Router();

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

apiRouter.get(
  "/projects",
  asyncHandler(async (req, res) => {
    const auth = await requireUser(req);
    const projects = await prisma.project.findMany({
      where: { members: { some: { userId: auth.userId } } },
      include: {
        releases: { orderBy: { createdAt: "desc" }, take: 3 },
        testCycles: { where: { status: "ACTIVE" }, take: 1 },
      },
    });
    res.json({ projects });
  }),
);

apiRouter.get(
  "/projects/:projectId/dashboard",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    await authProject(req, projectId);

    const activeCycle = await prisma.testCycle.findFirst({
      where: { projectId, status: "ACTIVE" },
      include: { release: { include: { builds: true } } },
    });

    if (!activeCycle) {
      return res.json({ activeCycle: null, stats: {}, criticalQueue: [], recentChanges: [] });
    }

    const cases = await prisma.testCycleCase.findMany({
      where: { testCycleId: activeCycle.id },
      include: { assignment: true, testCase: true },
    });

    const stats = {
      total: cases.length,
      unassigned: cases.filter((c) => !c.assignment || c.assignment.status === "AVAILABLE").length,
      inProgress: cases.filter((c) => c.assignment?.status === "IN_PROGRESS" || c.assignment?.status === "CLAIMED").length,
      completed: cases.filter((c) => c.assignment?.status === "COMPLETED").length,
      blocked: cases.filter((c) => c.assignment?.status === "BLOCKED").length,
      failedExecutions: await prisma.testExecution.count({
        where: {
          testCycleCase: { testCycleId: activeCycle.id },
          status: "FAILED",
        },
      }),
    };

    const criticalQueue = await getPrioritizedQueue(activeCycle.id, 10);
    const recentChanges = await prisma.developerChangeRequest.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { author: { select: { name: true } } },
    });

    const agentActivity = await prisma.agentActivity.findMany({
      where: { agent: { projectId } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { agent: { select: { displayName: true, agentType: true } } },
    });

    res.json({ activeCycle, stats, criticalQueue, recentChanges, agentActivity });
  }),
);

apiRouter.get(
  "/projects/:projectId/test-cases",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    await authProject(req, projectId);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;

    const testCases = await prisma.testCase.findMany({
      where: {
        projectId,
        archived: false,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { externalId: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        feature: true,
        module: true,
        requirements: true,
      },
      orderBy: { externalId: "asc" },
    });
    res.json({ testCases });
  }),
);

apiRouter.get(
  "/projects/:projectId/test-cases/:testCaseId",
  asyncHandler(async (req, res) => {
    const { projectId, testCaseId } = req.params;
    await authProject(req, projectId);

    const testCase = await prisma.testCase.findFirst({
      where: { id: testCaseId, projectId },
      include: {
        feature: true,
        module: true,
        requirements: true,
        designLinks: { include: { designDecision: true } },
        knowledge: { orderBy: { createdAt: "desc" }, take: 10 },
        cycleCases: {
          include: {
            testCycle: true,
            assignment: { include: { assigneeUser: true, assigneeAgent: true } },
            executions: { orderBy: { createdAt: "desc" }, take: 5, include: { evidence: true } },
            recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });
    if (!testCase) throw new NotFoundError("Test case not found");
    res.json({ testCase });
  }),
);

apiRouter.get(
  "/projects/:projectId/cycles/:cycleId/queue",
  asyncHandler(async (req, res) => {
    const { projectId, cycleId } = req.params;
    await authProject(req, projectId);
    const queue = await getPrioritizedQueue(cycleId, 50);
    res.json({ queue });
  }),
);

apiRouter.post(
  "/projects/:projectId/cycles/:cycleId/refresh-priorities",
  asyncHandler(async (req, res) => {
    const { projectId, cycleId } = req.params;
    const auth = await requireUser(req);
    await requireProjectRole(auth.userId, projectId, ["QA_LEAD", "ADMINISTRATOR"]);
    const recs = await refreshCyclePriorities(cycleId);
    publishProjectEvent(projectId, "priorities.refreshed", { count: recs.length });
    res.json({ recommendations: recs });
  }),
);

apiRouter.get(
  "/projects/:projectId/my-workspace",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const auth = await requireUser(req);
    await authProject(req, projectId);

    const assignments = await prisma.testAssignment.findMany({
      where: {
        assigneeUserId: auth.userId,
        testCycleCase: { testCycle: { projectId, status: "ACTIVE" } },
      },
      include: {
        testCycleCase: {
          include: { testCase: true, testCycle: true, executions: { take: 3, orderBy: { createdAt: "desc" } } },
        },
      },
    });

    const activeCycle = await prisma.testCycle.findFirst({ where: { projectId, status: "ACTIVE" } });
    const recommended = activeCycle ? await getPrioritizedQueue(activeCycle.id, 5) : [];

    res.json({ assignments, recommended });
  }),
);

apiRouter.get(
  "/projects/:projectId/team-board",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    await authProject(req, projectId);

    const activeCycle = await prisma.testCycle.findFirst({ where: { projectId, status: "ACTIVE" } });
    if (!activeCycle) return res.json({ cycle: null, cases: [], agents: [] });

    const cases = await prisma.testCycleCase.findMany({
      where: { testCycleId: activeCycle.id },
      include: {
        testCase: true,
        assignment: { include: { assigneeUser: true, assigneeAgent: true } },
      },
    });

    const agents = await prisma.agentRegistration.findMany({
      where: { projectId, isActive: true },
      include: { owner: { select: { name: true } }, activities: { take: 3, orderBy: { createdAt: "desc" } } },
    });

    res.json({ cycle: activeCycle, cases, agents });
  }),
);

apiRouter.post(
  "/assignments/:assignmentId/claim",
  asyncHandler(async (req, res) => {
    const auth = await resolveAuth(req);
    if (!auth) throw new ForbiddenError();

    const body = z.object({ expectedLockVersion: z.number().optional() }).parse(req.body ?? {});
    const assignment = await claimAssignment({
      assignmentId: req.params.assignmentId,
      userId: auth.agentId ? undefined : auth.userId,
      agentId: auth.agentId,
      expectedLockVersion: body.expectedLockVersion,
    });

    if (auth.agentId) {
      await prisma.agentActivity.create({
        data: { agentId: auth.agentId, action: "CLAIM_TEST", details: { assignmentId: assignment.id } },
      });
    }

    res.json({ assignment });
  }),
);

apiRouter.post(
  "/assignments/:assignmentId/release",
  asyncHandler(async (req, res) => {
    const auth = await resolveAuth(req);
    if (!auth) throw new ForbiddenError();
    const body = z.object({ reason: z.string().optional() }).parse(req.body ?? {});

    const assignment = await releaseAssignment({
      assignmentId: req.params.assignmentId,
      userId: auth.agentId ? undefined : auth.userId,
      agentId: auth.agentId,
      reason: body.reason,
    });
    res.json({ assignment });
  }),
);

apiRouter.post(
  "/executions/manual",
  asyncHandler(async (req, res) => {
    const auth = await resolveAuth(req);
    if (!auth?.userId && !auth?.agentId) throw new ForbiddenError();

    const body = z
      .object({
        cycleCaseId: z.string(),
        buildId: z.string(),
        environmentId: z.string().optional(),
        status: z.enum(["PASSED", "FAILED", "BLOCKED", "NOT_RUN"]),
        actualResults: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(req.body);

    const cycleCase = await prisma.testCycleCase.findUnique({
      where: { id: body.cycleCaseId },
      include: { testCycle: true, assignment: true },
    });
    if (!cycleCase) throw new NotFoundError();

    const execution = await prisma.testExecution.create({
      data: {
        testCycleCaseId: body.cycleCaseId,
        buildId: body.buildId,
        environmentId: body.environmentId,
        executedByUserId: auth.agentId ? undefined : auth.userId,
        executedByAgentId: auth.agentId,
        status: body.status,
        actualResults: body.actualResults,
        notes: body.notes,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    if (cycleCase.assignment) {
      await prisma.testAssignment.update({
        where: { id: cycleCase.assignment.id },
        data: {
          status: body.status === "PASSED" ? "COMPLETED" : body.status === "BLOCKED" ? "BLOCKED" : "IN_PROGRESS",
          completedAt: body.status === "PASSED" ? new Date() : undefined,
          lockVersion: { increment: 1 },
        },
      });
    }

    publishProjectEvent(cycleCase.testCycle.projectId, "execution.recorded", { execution });
    res.status(201).json({ execution });
  }),
);

apiRouter.post(
  "/executions/automated",
  asyncHandler(async (req, res) => {
    const auth = await resolveAuth(req);
    if (!auth?.userId && !auth?.agentId) throw new ForbiddenError();

    const body = z
      .object({
        testCaseExternalId: z.string(),
        cycleCaseId: z.string(),
        buildId: z.string(),
        environmentId: z.string().optional(),
      })
      .parse(req.body);

    const result = await runAutomatedTest({
      ...body,
      userId: auth.agentId ? undefined : auth.userId,
      agentId: auth.agentId,
    });
    res.status(201).json(result);
  }),
);

apiRouter.get(
  "/projects/:projectId/design-decisions",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    await authProject(req, projectId);
    const decisions = await prisma.designDecision.findMany({
      where: { projectId },
      include: {
        author: { select: { name: true } },
        approver: { select: { name: true } },
        testCases: { include: { testCase: true } },
        clarifications: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ decisions });
  }),
);

apiRouter.post(
  "/projects/:projectId/design-decisions/:decisionId/clarifications",
  asyncHandler(async (req, res) => {
    const { projectId, decisionId } = req.params;
    const auth = await requireUser(req);
    await requireProjectRole(auth.userId, projectId, ["QA_ENGINEER", "QA_LEAD", "DEVELOPER"]);

    const body = z.object({ question: z.string().min(1) }).parse(req.body);
    const clarification = await prisma.designClarification.create({
      data: {
        designDecisionId: decisionId,
        requestedByUserId: auth.userId,
        question: body.question,
      },
    });

    publishProjectEvent(projectId, "design.clarification", { clarification });
    res.status(201).json({ clarification });
  }),
);

apiRouter.get(
  "/projects/:projectId/developer-changes",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    await authProject(req, projectId);
    const changes = await prisma.developerChangeRequest.findMany({
      where: { projectId },
      include: { author: { select: { name: true } }, release: true, build: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ changes });
  }),
);

apiRouter.post(
  "/projects/:projectId/developer-changes",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const auth = await requireUser(req);
    await requireProjectRole(auth.userId, projectId, ["DEVELOPER", "ADMINISTRATOR"]);

    const body = z
      .object({
        title: z.string().min(1),
        description: z.string().min(1),
        releaseId: z.string().optional(),
        buildId: z.string().optional(),
        featureId: z.string().optional(),
        urgency: z.enum(["P0", "P1", "P2", "P3"]).default("P1"),
        impactedTestIds: z.array(z.string()).default([]),
        missingCoverage: z.string().optional(),
        submit: z.boolean().default(false),
      })
      .parse(req.body);

    const change = await prisma.developerChangeRequest.create({
      data: {
        projectId,
        authorUserId: auth.userId,
        title: body.title,
        description: body.description,
        releaseId: body.releaseId,
        buildId: body.buildId,
        featureId: body.featureId,
        urgency: body.urgency,
        impactedTestIds: body.impactedTestIds,
        missingCoverage: body.missingCoverage,
        status: body.submit ? "SUBMITTED" : "DRAFT",
      },
    });

    if (body.submit) {
      await notifyProjectLeads(projectId, {
        type: "URGENT_CHANGE",
        title: "Developer change submitted",
        body: change.title,
        linkPath: `/projects/${projectId}/developer-changes`,
      });

      await notifySwitchCollaboration({
        title: "Developer testing request",
        body: `${change.title}\n${change.description}\nImpacted tests: ${change.impactedTestIds.join(", ") || "TBD"}`,
      });

      publishProjectEvent(projectId, "developer.change", { change });
    }

    res.status(201).json({ change });
  }),
);

apiRouter.post(
  "/projects/:projectId/developer-changes/:changeId/approve",
  asyncHandler(async (req, res) => {
    const { projectId, changeId } = req.params;
    const auth = await requireUser(req);
    await requireProjectRole(auth.userId, projectId, ["QA_LEAD", "ADMINISTRATOR"]);

    const change = await prisma.developerChangeRequest.update({
      where: { id: changeId },
      data: { status: "APPROVED", approvedByUserId: auth.userId },
    });

    const activeCycle = await prisma.testCycle.findFirst({ where: { projectId, status: "ACTIVE" } });
    if (activeCycle) {
      await refreshCyclePriorities(activeCycle.id);
    }

    publishProjectEvent(projectId, "developer.change.approved", { change });
    res.json({ change });
  }),
);

apiRouter.get(
  "/projects/:projectId/defects",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    await authProject(req, projectId);
    const defects = await prisma.defect.findMany({
      where: { projectId },
      include: {
        reporter: { select: { name: true } },
        assignee: { select: { name: true } },
        testCase: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ defects });
  }),
);

apiRouter.post(
  "/projects/:projectId/defects",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const auth = await requireUser(req);
    await requireProjectRole(auth.userId, projectId, ["QA_ENGINEER", "QA_LEAD", "DEVELOPER"]);

    const body = z
      .object({
        summary: z.string().min(1),
        description: z.string().optional(),
        severity: z.string().default("MEDIUM"),
        priority: z.enum(["P0", "P1", "P2", "P3"]).default("P2"),
        testCaseId: z.string().optional(),
        executionId: z.string().optional(),
        expectedBehavior: z.string().optional(),
        actualBehavior: z.string().optional(),
        designConflict: z.boolean().default(false),
      })
      .parse(req.body);

    const count = await prisma.defect.count({ where: { projectId } });
    const externalId = `DEF-${String(count + 1).padStart(4, "0")}`;

    const defect = await prisma.defect.create({
      data: {
        projectId,
        externalId,
        summary: body.summary,
        description: body.description,
        severity: body.severity,
        priority: body.priority,
        testCaseId: body.testCaseId,
        executionId: body.executionId,
        expectedBehavior: body.expectedBehavior,
        actualBehavior: body.actualBehavior,
        designConflict: body.designConflict,
        reporterUserId: auth.userId,
        status: "NEW",
      },
    });

    publishProjectEvent(projectId, "defect.created", { defect });
    res.status(201).json({ defect });
  }),
);

apiRouter.patch(
  "/projects/:projectId/defects/:defectId",
  asyncHandler(async (req, res) => {
    const { projectId, defectId } = req.params;
    const auth = await requireUser(req);
    await requireProjectRole(auth.userId, projectId, ["DEVELOPER", "QA_LEAD", "QA_ENGINEER"]);

    const body = z
      .object({
        status: z
          .enum([
            "NEW",
            "TRIAGED",
            "IN_PROGRESS",
            "READY_FOR_QA",
            "VERIFIED",
            "CLOSED",
            "REOPENED",
            "REJECTED",
          ])
          .optional(),
        assigneeUserId: z.string().optional(),
        resolution: z.string().optional(),
      })
      .parse(req.body);

    const defect = await prisma.defect.update({
      where: { id: defectId },
      data: body,
    });

    publishProjectEvent(projectId, "defect.updated", { defect });
    res.json({ defect });
  }),
);

apiRouter.get(
  "/projects/:projectId/knowledge",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    await authProject(req, projectId);
    const entries = await prisma.knowledgeEntry.findMany({
      where: { projectId },
      include: { author: { select: { name: true } }, testCase: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ entries });
  }),
);

apiRouter.post(
  "/projects/:projectId/knowledge",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const auth = await requireUser(req);
    await requireProjectRole(auth.userId, projectId, ["QA_ENGINEER", "QA_LEAD", "DEVELOPER"]);

    const body = z
      .object({
        type: z.enum(["FINDING", "CLARIFICATION", "KNOWN_ISSUE", "TESTING_NOTE", "WORKAROUND"]),
        title: z.string().min(1),
        content: z.string().min(1),
        testCaseId: z.string().optional(),
      })
      .parse(req.body);

    const entry = await prisma.knowledgeEntry.create({
      data: { ...body, projectId, authorUserId: auth.userId },
    });

    publishProjectEvent(projectId, "knowledge.created", { entry });
    res.status(201).json({ entry });
  }),
);

apiRouter.get(
  "/projects/:projectId/release-readiness",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    await authProject(req, projectId);

    const activeCycle = await prisma.testCycle.findFirst({
      where: { projectId, status: "ACTIVE" },
      include: { release: true },
    });

    if (!activeCycle) {
      return res.json({
        ready: false,
        summary: "No active test cycle.",
        blockers: ["Create or activate a test cycle"],
      });
    }

    const cases = await prisma.testCycleCase.findMany({
      where: { testCycleId: activeCycle.id, plannedPriority: { in: ["P0", "P1"] } },
      include: { assignment: true, testCase: true },
    });

    const incompleteCritical = cases.filter((c) => c.assignment?.status !== "COMPLETED");
    const openDefects = await prisma.defect.count({
      where: { projectId, status: { notIn: ["CLOSED", "REJECTED"] }, priority: { in: ["P0", "P1"] } },
    });

    const blockers: string[] = [];
    if (incompleteCritical.length) {
      blockers.push(`${incompleteCritical.length} critical/high tests not completed`);
    }
    if (openDefects) blockers.push(`${openDefects} open P0/P1 defects`);

    res.json({
      ready: blockers.length === 0,
      release: activeCycle.release,
      incompleteCritical: incompleteCritical.map((c) => c.testCase.externalId),
      openDefects,
      blockers,
      disclaimer:
        "Automated readiness suggestions require human QA lead approval before release.",
    });
  }),
);

apiRouter.get(
  "/projects/:projectId/agents",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    await authProject(req, projectId);
    const agents = await prisma.agentRegistration.findMany({
      where: { projectId },
      include: {
        owner: { select: { name: true, email: true } },
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    const rooms = await prisma.switchRoomLink.findMany({ where: { projectId } });
    res.json({ agents, rooms });
  }),
);

apiRouter.post(
  "/projects/:projectId/agents",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const auth = await requireUserAuth(req);
    await requireProjectRole(auth.userId, projectId, ["ADMINISTRATOR", "QA_LEAD", "DEVELOPER"]);

    const body = z
      .object({
        name: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/),
        displayName: z.string().min(1),
        agentType: z.enum(["DEVELOPMENT", "QA", "QA_COORDINATION"]),
        switchAgentId: z.string().optional(),
        switchRoomId: z.string().optional(),
        capabilities: z.record(z.unknown()).default({}),
      })
      .parse(req.body);

    const apiKey = generateAgentApiKey();
    const agent = await prisma.agentRegistration.create({
      data: {
        projectId,
        ownerUserId: auth.userId,
        name: body.name,
        displayName: body.displayName,
        agentType: body.agentType,
        switchAgentId: body.switchAgentId,
        switchRoomId: body.switchRoomId,
        apiKeyHash: hashAgentKey(apiKey),
        apiKeyPrefix: apiKey.slice(0, 10),
        capabilities: body.capabilities as Prisma.InputJsonValue,
      },
    });

    await recordAudit({
      userId: auth.userId,
      projectId,
      action: "AGENT_REGISTERED",
      entityType: "AgentRegistration",
      entityId: agent.id,
    });

    res.status(201).json({ agent, apiKey });
  }),
);

apiRouter.post(
  "/projects/:projectId/coordination/scan",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const auth = await resolveAuth(req);
    if (!auth?.userId && !auth?.agentId) throw new ForbiddenError();

    const activeCycle = await prisma.testCycle.findFirst({ where: { projectId, status: "ACTIVE" } });
    if (!activeCycle) return res.json({ findings: [] });

    const criticalUnassigned = await prisma.testCycleCase.findMany({
      where: {
        testCycleId: activeCycle.id,
        plannedPriority: "P0",
        OR: [{ assignment: null }, { assignment: { status: "AVAILABLE" } }],
      },
      include: { testCase: true },
    });

    const findings = criticalUnassigned.map((c) => ({
      type: "UNASSIGNED_CRITICAL",
      testCaseId: c.testCase.id,
      externalId: c.testCase.externalId,
      title: c.testCase.title,
      recommendation: "Assign and execute before release.",
    }));

    if (findings.length) {
      await notifyProjectLeads(projectId, {
        type: "GENERAL",
        title: "Critical coverage gap detected",
        body: `${findings.length} unassigned P0 test(s) remain in ${activeCycle.name}`,
        linkPath: `/projects/${projectId}/team-board`,
      });

      await notifySwitchCollaboration({
        title: "QA Coordination alert",
        body: `Unassigned critical tests: ${findings.map((f) => f.externalId).join(", ")}`,
      });
    }

    if (auth.agentId) {
      await prisma.agentActivity.create({
        data: {
          agentId: auth.agentId,
          action: "COORDINATION_SCAN",
          details: { findingsCount: findings.length },
        },
      });
    }

    res.json({ findings });
  }),
);

apiRouter.get(
  "/notifications",
  asyncHandler(async (req, res) => {
    const auth = await requireUser(req);
    const notifications = await prisma.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ notifications });
  }),
);

apiRouter.post(
  "/notifications/:id/read",
  asyncHandler(async (req, res) => {
    const auth = await requireUser(req);
    const notification = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: auth.userId },
      data: { read: true },
    });
    res.json({ updated: notification.count });
  }),
);

// Agent-facing tool endpoints (also used by MCP server)
export const agentToolsRouter = Router();

agentToolsRouter.use(
  asyncHandler(async (req, _res, next) => {
    const auth = await resolveAuth(req);
    if (!auth?.agentId) throw new ForbiddenError("Agent API key required");
    (req as Request & { agentAuth: typeof auth }).agentAuth = auth;
    next();
  }),
);

agentToolsRouter.get(
  "/test-queue",
  asyncHandler(async (req, res) => {
    const auth = (req as Request & { agentAuth: { agentId: string } }).agentAuth;
    const agent = await prisma.agentRegistration.findUnique({ where: { id: auth.agentId } });
    if (!agent) throw new NotFoundError();

    const cycle = await prisma.testCycle.findFirst({
      where: { projectId: agent.projectId, status: "ACTIVE" },
    });
    if (!cycle) return res.json({ queue: [] });

    const queue = await getPrioritizedQueue(cycle.id, 30);
    res.json({ queue, projectId: agent.projectId, cycleId: cycle.id });
  }),
);

agentToolsRouter.get(
  "/design-decisions",
  asyncHandler(async (req, res) => {
    const auth = (req as Request & { agentAuth: { agentId: string } }).agentAuth;
    const agent = await prisma.agentRegistration.findUnique({ where: { id: auth.agentId } });
    if (!agent) throw new NotFoundError();

    const testCaseExternalId = typeof req.query.testCaseExternalId === "string" ? req.query.testCaseExternalId : undefined;

    const decisions = await prisma.designDecision.findMany({
      where: {
        projectId: agent.projectId,
        status: "APPROVED",
        ...(testCaseExternalId
          ? { testCases: { some: { testCase: { externalId: testCaseExternalId } } } }
          : {}),
      },
      include: { testCases: { include: { testCase: true } } },
    });
    res.json({ decisions });
  }),
);

agentToolsRouter.post(
  "/claim",
  asyncHandler(async (req, res) => {
    const auth = (req as Request & { agentAuth: { agentId: string } }).agentAuth;
    const body = z.object({ assignmentId: z.string() }).parse(req.body);
    const assignment = await claimAssignment({ assignmentId: body.assignmentId, agentId: auth.agentId });
    res.json({ assignment });
  }),
);
