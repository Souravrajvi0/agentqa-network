import type { ChangeRequestStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import { refreshCyclePriorities } from "./prioritization.js";
import { publishProjectEvent } from "../ws/hub.js";
import { recordAudit } from "./audit.js";
import { recordDeliveryEvent } from "./deliveryTimeline.js";

const transitions: Record<ChangeRequestStatus, ChangeRequestStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["IN_REVIEW", "APPROVED", "REJECTED"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["CI_PENDING", "QA_PENDING", "COMPLETED", "REJECTED"],
  REJECTED: ["DRAFT"],
  CI_PENDING: ["QA_PENDING", "APPROVED", "REJECTED"],
  QA_PENDING: ["QA_IN_PROGRESS", "REJECTED"],
  QA_IN_PROGRESS: ["VERIFIED", "COMPLETED", "REJECTED"],
  VERIFIED: ["COMPLETED"],
  COMPLETED: [],
};

export function assertChangeTransition(from: ChangeRequestStatus, to: ChangeRequestStatus) {
  if (!transitions[from]?.includes(to)) {
    throw new ConflictError(`Invalid change transition ${from} → ${to}`);
  }
}

export async function transitionDeveloperChange(params: {
  projectId: string;
  changeId: string;
  actorUserId: string;
  toStatus: ChangeRequestStatus;
  impactedTestIds?: string[];
}) {
  const change = await prisma.developerChangeRequest.findFirst({
    where: { id: params.changeId, projectId: params.projectId },
  });
  if (!change) throw new NotFoundError("Change not found");

  assertChangeTransition(change.status, params.toStatus);

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: params.projectId, userId: params.actorUserId } },
  });
  if (!member) throw new ForbiddenError("Not a project member");

  if (params.toStatus === "SUBMITTED" && !["DEVELOPER", "ADMINISTRATOR"].includes(member.role)) {
    throw new ForbiddenError("Only developers can submit changes");
  }
  if (["APPROVED", "REJECTED", "IN_REVIEW"].includes(params.toStatus) && !["QA_LEAD", "ADMINISTRATOR"].includes(member.role)) {
    throw new ForbiddenError("Only QA leads can review changes");
  }
  if (["COMPLETED", "VERIFIED"].includes(params.toStatus) && !["QA_LEAD", "ADMINISTRATOR", "QA_ENGINEER"].includes(member.role)) {
    throw new ForbiddenError("QA role required to verify change");
  }

  const updated = await prisma.developerChangeRequest.update({
    where: { id: change.id },
    data: {
      status: params.toStatus,
      approvedByUserId: params.toStatus === "APPROVED" ? params.actorUserId : change.approvedByUserId,
      qaAcknowledged: params.toStatus === "APPROVED" ? true : change.qaAcknowledged,
      impactedTestIds: params.impactedTestIds ?? change.impactedTestIds,
      submittedAt: params.toStatus === "SUBMITTED" ? new Date() : change.submittedAt,
      approvedAt: params.toStatus === "APPROVED" ? new Date() : change.approvedAt,
    },
  });

  if (params.toStatus === "APPROVED") {
    const activeCycle = await prisma.testCycle.findFirst({
      where: { projectId: params.projectId, status: "ACTIVE" },
    });
    if (activeCycle) await refreshCyclePriorities(activeCycle.id);
  }

  await recordAudit({
    projectId: params.projectId,
    userId: params.actorUserId,
    action: `developer_change.${params.toStatus.toLowerCase()}`,
    entityType: "DeveloperChangeRequest",
    entityId: change.id,
    details: { from: change.status, to: params.toStatus },
  });

  await recordDeliveryEvent({
    projectId: params.projectId,
    changeId: change.id,
    actorUserId: params.actorUserId,
    kind: `change.${params.toStatus.toLowerCase()}`,
    title: `Change ${params.toStatus.replace(/_/g, " ").toLowerCase()}`,
    entityType: "DeveloperChangeRequest",
    entityId: change.id,
  });

  publishProjectEvent(params.projectId, "developer.change.updated", { change: updated });
  return updated;
}

export async function enrichChanges(projectId: string) {
  const changes = await prisma.developerChangeRequest.findMany({
    where: { projectId },
    include: {
      author: { select: { name: true, email: true } },
      release: true,
      build: true,
      feature: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const allTestIds = [...new Set(changes.flatMap((c) => c.impactedTestIds))];
  const tests = allTestIds.length
    ? await prisma.testCase.findMany({
        where: { projectId, id: { in: allTestIds } },
        select: { id: true, externalId: true, title: true, priority: true },
      })
    : [];
  const testMap = Object.fromEntries(tests.map((t) => [t.id, t]));

  return changes.map((c) => ({
    ...c,
    impactedTests: c.impactedTestIds.map((id) => testMap[id]).filter(Boolean),
  }));
}
