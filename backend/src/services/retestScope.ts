import type { RetestScopeStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ForbiddenError, NotFoundError, ConflictError } from "../lib/errors.js";
import { recordDeliveryEvent } from "./deliveryTimeline.js";
import { ciBlocksQa } from "./ciRuns.js";
import { publishProjectEvent } from "../ws/hub.js";
import { createNotification } from "./notifications.js";
import { recordAudit } from "./audit.js";

export async function proposeRetestScope(params: {
  projectId: string;
  changeId: string;
  userId: string;
  testCaseIds: string[];
  description?: string;
  buildId?: string;
}) {
  const change = await prisma.developerChangeRequest.findFirst({
    where: { id: params.changeId, projectId: params.projectId },
  });
  if (!change) throw new NotFoundError("Change not found");

  const lastVersion = await prisma.retestScope.aggregate({
    where: { developerChangeId: params.changeId },
    _max: { version: true },
  });
  const version = (lastVersion._max.version ?? 0) + 1;

  const scope = await prisma.retestScope.create({
    data: {
      projectId: params.projectId,
      developerChangeId: params.changeId,
      buildId: params.buildId ?? change.buildId ?? undefined,
      version,
      status: "PROPOSED",
      description: params.description,
      testCaseIds: params.testCaseIds,
      proposedByUserId: params.userId,
    },
  });

  await recordDeliveryEvent({
    projectId: params.projectId,
    changeId: params.changeId,
    actorUserId: params.userId,
    kind: "retest_scope.proposed",
    title: `Retest scope v${version} proposed`,
    entityType: "RetestScope",
    entityId: scope.id,
  });

  return scope;
}

export async function approveRetestScope(params: {
  projectId: string;
  scopeId: string;
  leadUserId: string;
  testCaseIds?: string[];
}) {
  const scope = await prisma.retestScope.findFirst({
    where: { id: params.scopeId, projectId: params.projectId },
    include: { developerChange: true },
  });
  if (!scope) throw new NotFoundError("Retest scope not found");

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: params.projectId, userId: params.leadUserId } },
  });
  if (!member || !["QA_LEAD", "ADMINISTRATOR"].includes(member.role)) {
    throw new ForbiddenError("QA Lead approval required");
  }

  const approved = await prisma.retestScope.update({
    where: { id: scope.id },
    data: {
      status: "APPROVED",
      approvedByUserId: params.leadUserId,
      approvedAt: new Date(),
      testCaseIds: params.testCaseIds ?? scope.testCaseIds,
    },
  });

  const change = scope.developerChange;
  const latestCi = await prisma.ciRun.findFirst({
    where: { projectId: params.projectId, developerChangeId: change.id },
    orderBy: { updatedAt: "desc" },
  });

  const override = latestCi
    ? await prisma.ciGateOverride.findFirst({
        where: { projectId: params.projectId, ciRunId: latestCi.id },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const blocked =
    latestCi && ciBlocksQa({ status: latestCi.status, conclusion: latestCi.conclusion }) && !override;

  let handoff = null;
  if (!blocked) {
    handoff = await prisma.qAHandoff.create({
      data: {
        projectId: params.projectId,
        developerChangeId: change.id,
        buildId: approved.buildId ?? change.buildId,
        ciRunId: latestCi?.id,
        retestScopeId: approved.id,
        createdByUserId: params.leadUserId,
        status: "PENDING",
        summary: `Retest approved for: ${change.title}`,
      },
    });

    await prisma.developerChangeRequest.update({
      where: { id: change.id },
      data: { status: "QA_IN_PROGRESS" },
    });

    const qaMembers = await prisma.projectMember.findMany({
      where: { projectId: params.projectId, role: { in: ["QA_ENGINEER", "QA_LEAD"] } },
    });
    for (const m of qaMembers) {
      await createNotification({
        userId: m.userId,
        type: "ASSIGNMENT",
        title: "QA handoff ready",
        body: change.title,
        linkPath: `/projects/${params.projectId}/qa-inbox`,
      });
    }
  }

  await recordDeliveryEvent({
    projectId: params.projectId,
    changeId: change.id,
    actorUserId: params.leadUserId,
    kind: "retest_scope.approved",
    title: blocked ? "Scope approved — QA blocked by CI" : "Scope approved — QA handoff created",
    entityType: "RetestScope",
    entityId: approved.id,
  });

  publishProjectEvent(params.projectId, "delivery.updated", { changeId: change.id });
  return { scope: approved, handoff, ciBlocked: blocked };
}

export async function createCiGateOverride(params: {
  projectId: string;
  ciRunId: string;
  actorUserId: string;
  reason: string;
  developerChangeId?: string;
  buildId?: string;
}) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: params.projectId, userId: params.actorUserId } },
  });
  if (!member || !["QA_LEAD", "ADMINISTRATOR"].includes(member.role)) {
    throw new ForbiddenError("Only QA leads can override CI gates");
  }

  const ciRun = await prisma.ciRun.findUnique({ where: { id: params.ciRunId } });
  if (!ciRun || ciRun.projectId !== params.projectId) {
    throw new NotFoundError("CI run not found");
  }

  const override = await prisma.ciGateOverride.create({
    data: {
      projectId: params.projectId,
      ciRunId: params.ciRunId,
      actorUserId: params.actorUserId,
      reason: params.reason,
      developerChangeId: params.developerChangeId,
      buildId: params.buildId,
    },
  });

  await recordAudit({
    projectId: params.projectId,
    userId: params.actorUserId,
    action: "ci_gate.override",
    entityType: "CiGateOverride",
    entityId: override.id,
    details: { ciRunId: params.ciRunId, ciConclusion: ciRun.conclusion },
  });

  await recordDeliveryEvent({
    projectId: params.projectId,
    changeId: params.developerChangeId,
    actorUserId: params.actorUserId,
    kind: "ci.override",
    title: "CI gate overridden (CI result unchanged)",
    entityType: "CiGateOverride",
    entityId: override.id,
  });

  return override;
}
