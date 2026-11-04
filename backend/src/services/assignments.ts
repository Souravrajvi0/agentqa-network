import { prisma } from "../lib/prisma.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import { publishProjectEvent } from "../ws/hub.js";
import type { AssignmentStatus } from "@prisma/client";

export async function claimAssignment(params: {
  assignmentId: string;
  userId?: string;
  agentId?: string;
  expectedLockVersion?: number;
}) {
  const { assignmentId, userId, agentId, expectedLockVersion } = params;
  if (!userId && !agentId) throw new ForbiddenError("Claimant required");

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.testAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        testCycleCase: {
          include: {
            testCycle: true,
            testCase: true,
          },
        },
      },
    });
    if (!assignment) throw new NotFoundError("Assignment not found");

    if (
      expectedLockVersion !== undefined &&
      assignment.lockVersion !== expectedLockVersion
    ) {
      throw new ConflictError(
        "Assignment was updated by another user. Refresh and try again.",
        "STALE_LOCK",
      );
    }

    const claimable: AssignmentStatus[] = ["AVAILABLE", "RELEASED"];
    const isOwner =
      (userId && assignment.assigneeUserId === userId) ||
      (agentId && assignment.assigneeAgentId === agentId);

    if (!claimable.includes(assignment.status) && !isOwner) {
      if (assignment.status === "CLAIMED" || assignment.status === "IN_PROGRESS") {
        throw new ConflictError(
          `Test ${assignment.testCycleCase.testCase.externalId} is already claimed.`,
          "ALREADY_CLAIMED",
        );
      }
      throw new ConflictError("Assignment is not available", "NOT_AVAILABLE");
    }

    if (assignment.status !== "AVAILABLE" && assignment.status !== "RELEASED" && !isOwner) {
      throw new ConflictError("Assignment is not available");
    }

    const updated = await tx.testAssignment.update({
      where: { id: assignmentId, lockVersion: assignment.lockVersion },
      data: {
        assigneeUserId: userId ?? null,
        assigneeAgentId: agentId ?? null,
        status: "CLAIMED",
        claimedAt: new Date(),
        lockVersion: { increment: 1 },
        claimToken: cryptoRandom(),
      },
      include: {
        testCycleCase: { include: { testCase: true } },
        assigneeUser: { select: { id: true, name: true, email: true } },
        assigneeAgent: { select: { id: true, displayName: true, name: true } },
      },
    });

    publishProjectEvent(assignment.testCycleCase.testCycle.projectId, "assignment.claimed", {
      assignment: updated,
    });

    return updated;
  });
}

export async function releaseAssignment(params: {
  assignmentId: string;
  userId?: string;
  agentId?: string;
  reason?: string;
}) {
  const assignment = await prisma.testAssignment.findUnique({
    where: { id: params.assignmentId },
    include: { testCycleCase: { include: { testCycle: true } } },
  });
  if (!assignment) throw new NotFoundError("Assignment not found");

  const isOwner =
    (params.userId && assignment.assigneeUserId === params.userId) ||
    (params.agentId && assignment.assigneeAgentId === params.agentId);
  if (!isOwner) throw new ForbiddenError("Only the assignee can release");

  const updated = await prisma.testAssignment.update({
    where: { id: params.assignmentId },
    data: {
      status: "RELEASED",
      assigneeUserId: null,
      assigneeAgentId: null,
      blockedReason: params.reason,
      lockVersion: { increment: 1 },
    },
  });

  publishProjectEvent(assignment.testCycleCase.testCycle.projectId, "assignment.released", {
    assignment: updated,
  });
  return updated;
}

export async function assignAssignmentByLead(params: {
  assignmentId: string;
  assigneeUserId: string;
  leadUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.testAssignment.findUnique({
      where: { id: params.assignmentId },
      include: {
        testCycleCase: { include: { testCycle: true, testCase: true } },
      },
    });
    if (!assignment) throw new NotFoundError("Assignment not found");

    const projectId = assignment.testCycleCase.testCycle.projectId;
    const leadMember = await tx.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: params.leadUserId } },
    });
    if (!leadMember || !["QA_LEAD", "ADMINISTRATOR"].includes(leadMember.role)) {
      throw new ForbiddenError("Only QA leads can assign tests");
    }

    const assigneeMember = await tx.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: params.assigneeUserId } },
    });
    if (!assigneeMember || !["QA_ENGINEER", "QA_LEAD", "ADMINISTRATOR"].includes(assigneeMember.role)) {
      throw new ForbiddenError("Assignee must be a QA-capable project member");
    }

    if (assignment.status === "COMPLETED") {
      throw new ConflictError("Cannot reassign a completed test");
    }

    const updated = await tx.testAssignment.update({
      where: { id: params.assignmentId, lockVersion: assignment.lockVersion },
      data: {
        assigneeUserId: params.assigneeUserId,
        assigneeAgentId: null,
        status: "CLAIMED",
        claimedAt: new Date(),
        lockVersion: { increment: 1 },
        claimToken: cryptoRandom(),
      },
      include: {
        testCycleCase: { include: { testCase: true } },
        assigneeUser: { select: { id: true, name: true, email: true } },
      },
    });

    publishProjectEvent(projectId, "assignment.assigned", { assignment: updated });
    return updated;
  });
}

function cryptoRandom(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
