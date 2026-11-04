import { prisma } from "../lib/prisma.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import { recordDeliveryEvent } from "./deliveryTimeline.js";
import { recordAudit } from "./audit.js";
import { publishProjectEvent } from "../ws/hub.js";
import { ciBlocksQa } from "./ciRuns.js";
import { notifySwitchDeliveryEvent } from "./switchNotifications.js";

type HandoffProgress = {
  required: number;
  completed: number;
  passed: number;
  failed: number;
  blocked: number;
  remaining: number;
  percentComplete: number;
};

export async function computeHandoffProgress(
  projectId: string,
  handoffId: string,
  buildId: string | null | undefined,
  testCaseIds: string[],
): Promise<HandoffProgress> {
  const required = testCaseIds.length;
  if (!required || !buildId) {
    return {
      required,
      completed: 0,
      passed: 0,
      failed: 0,
      blocked: 0,
      remaining: required,
      percentComplete: 0,
    };
  }

  const activeCycle = await prisma.testCycle.findFirst({
    where: { projectId, status: "ACTIVE" },
  });
  if (!activeCycle) {
    return {
      required,
      completed: 0,
      passed: 0,
      failed: 0,
      blocked: 0,
      remaining: required,
      percentComplete: 0,
    };
  }

  const cycleCases = await prisma.testCycleCase.findMany({
    where: { testCycleId: activeCycle.id, testCaseId: { in: testCaseIds } },
    select: { id: true, testCaseId: true },
  });

  let passed = 0;
  let failed = 0;
  let blocked = 0;
  let completed = 0;

  for (const tcId of testCaseIds) {
    const cc = cycleCases.find((c) => c.testCaseId === tcId);
    if (!cc) continue;
    const latest = await prisma.testExecution.findFirst({
      where: { testCycleCaseId: cc.id, buildId, qaHandoffId: handoffId },
      orderBy: { createdAt: "desc" },
    });
    if (!latest || latest.status === "NOT_RUN") continue;
    completed += 1;
    if (latest.status === "PASSED") passed += 1;
    else if (latest.status === "FAILED") failed += 1;
    else if (latest.status === "BLOCKED") blocked += 1;
  }

  const remaining = Math.max(0, required - completed);
  return {
    required,
    completed,
    passed,
    failed,
    blocked,
    remaining,
    percentComplete: required ? Math.round((completed / required) * 100) : 0,
  };
}

export async function acceptQaHandoff(params: {
  projectId: string;
  handoffId: string;
  userId: string;
}) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: params.projectId, userId: params.userId } },
  });
  if (!member || !["QA_ENGINEER", "QA_LEAD", "ADMINISTRATOR"].includes(member.role)) {
    throw new ForbiddenError("QA role required to accept handoffs");
  }

  const handoff = await prisma.qAHandoff.findFirst({
    where: { id: params.handoffId, projectId: params.projectId },
    include: { developerChange: true },
  });
  if (!handoff) throw new NotFoundError("Handoff not found");

  if (handoff.status === "ACCEPTED" || handoff.status === "IN_PROGRESS") {
    if (handoff.assignedToUserId === params.userId) {
      return { handoff, alreadyAccepted: true as const };
    }
    throw new ConflictError("Handoff already accepted by another QA engineer");
  }
  if (handoff.status !== "PENDING") {
    throw new ConflictError(`Handoff cannot be accepted in status ${handoff.status}`);
  }

  const updated = await prisma.qAHandoff.updateMany({
    where: { id: params.handoffId, projectId: params.projectId, status: "PENDING" },
    data: {
      status: "ACCEPTED",
      assignedToUserId: params.userId,
      acceptedAt: new Date(),
    },
  });

  if (updated.count === 0) {
    const current = await prisma.qAHandoff.findUniqueOrThrow({ where: { id: params.handoffId } });
    if (current.assignedToUserId === params.userId && current.status === "ACCEPTED") {
      return { handoff: current, alreadyAccepted: true as const };
    }
    throw new ConflictError("Handoff was accepted by another QA engineer");
  }

  const accepted = await prisma.qAHandoff.findUniqueOrThrow({
    where: { id: params.handoffId },
    include: { developerChange: { select: { id: true, title: true } } },
  });

  await recordAudit({
    projectId: params.projectId,
    userId: params.userId,
    action: "qa_handoff.accept",
    entityType: "QAHandoff",
    entityId: accepted.id,
  });

  await recordDeliveryEvent({
    projectId: params.projectId,
    changeId: accepted.developerChangeId,
    actorUserId: params.userId,
    kind: "handoff.accepted",
    title: "QA handoff accepted",
    entityType: "QAHandoff",
    entityId: accepted.id,
  });

  publishProjectEvent(params.projectId, "delivery.updated", { changeId: accepted.developerChangeId });
  void notifySwitchDeliveryEvent(params.projectId, "QA handoff accepted", accepted.developerChange.title);

  return { handoff: accepted, alreadyAccepted: false as const };
}

export async function getQaHandoffDetail(projectId: string, handoffId: string) {
  const handoff = await prisma.qAHandoff.findFirst({
    where: { id: handoffId, projectId },
    include: {
      developerChange: { include: { author: true, authorAgent: true, build: true, feature: true } },
      retestScope: true,
      build: true,
      ciRun: true,
    },
  });
  if (!handoff) return null;

  const assignedToUser = handoff.assignedToUserId
    ? await prisma.user.findUnique({
        where: { id: handoff.assignedToUserId },
        select: { id: true, name: true, email: true },
      })
    : null;

  const override = handoff.ciRunId
    ? await prisma.ciGateOverride.findFirst({
        where: { projectId, ciRunId: handoff.ciRunId },
        include: { project: false },
        orderBy: { createdAt: "desc" },
      })
    : null;
  let overrideActor = null;
  if (override) {
    overrideActor = await prisma.user.findUnique({
      where: { id: override.actorUserId },
      select: { id: true, name: true, email: true },
    });
  }

  const designs = handoff.developerChange.featureId
    ? await prisma.designDecision.findMany({
        where: { projectId, featureId: handoff.developerChange.featureId },
        include: { clarifications: true },
      })
    : [];

  const timeline = await prisma.deliveryTimelineEvent.findMany({
    where: { projectId, changeId: handoff.developerChangeId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const defects = await prisma.defect.findMany({
    where: {
      projectId,
      OR: [
        { buildId: handoff.buildId ?? undefined },
        { featureId: handoff.developerChange.featureId ?? undefined },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const activeCycle = await prisma.testCycle.findFirst({
    where: { projectId, status: "ACTIVE" },
  });

  const scopeIds = handoff.retestScope.testCaseIds;
  const testCases = scopeIds.length
    ? await prisma.testCase.findMany({
        where: { projectId, id: { in: scopeIds } },
      })
    : [];

  const cycleCases = activeCycle
    ? await prisma.testCycleCase.findMany({
        where: { testCycleId: activeCycle.id, testCaseId: { in: scopeIds } },
      })
    : [];

  const buildId = handoff.buildId ?? handoff.developerChange.buildId;
  const scopeTests = testCases.map((tc) => {
    const cc = cycleCases.find((c) => c.testCaseId === tc.id);
    return {
      testCase: {
        id: tc.id,
        externalId: tc.externalId,
        title: tc.title,
        description: tc.description,
        steps: tc.steps,
        expectedResult: tc.expectedResults,
      },
      cycleCaseId: cc?.id ?? null,
      latestExecution: null as Awaited<ReturnType<typeof prisma.testExecution.findFirst>>,
      executionHistory: [] as Awaited<ReturnType<typeof prisma.testExecution.findMany>>,
    };
  });

  for (const row of scopeTests) {
    if (!row.cycleCaseId) continue;
    row.latestExecution = buildId
      ? await prisma.testExecution.findFirst({
          where: { testCycleCaseId: row.cycleCaseId, buildId, qaHandoffId: handoff.id },
          orderBy: { createdAt: "desc" },
        })
      : null;
    row.executionHistory = await prisma.testExecution.findMany({
      where: { testCycleCaseId: row.cycleCaseId, qaHandoffId: handoff.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { build: { select: { id: true, label: true } } },
    });
  }

  const progress = await computeHandoffProgress(projectId, handoff.id, buildId, scopeIds);

  const scopeApprover = handoff.retestScope.approvedByUserId
    ? await prisma.user.findUnique({
        where: { id: handoff.retestScope.approvedByUserId },
        select: { id: true, name: true, email: true },
      })
    : null;

  return {
    handoff: { ...handoff, assignedToUser },
    progress,
    scopeTests,
    designs,
    timeline,
    defects,
    ciOverride: override ? { ...override, actor: overrideActor } : null,
    ciGateBlocked:
      handoff.ciRun && ciBlocksQa(handoff.ciRun) && !override ? true : false,
    scopeApprover,
    activeCycleId: activeCycle?.id ?? null,
    buildId,
  };
}

export async function recordHandoffExecution(params: {
  projectId: string;
  handoffId: string;
  userId: string;
  testCaseId: string;
  status: "PASSED" | "FAILED" | "BLOCKED" | "NOT_RUN";
  notes?: string;
  actualResults?: string;
}) {
  const detail = await getQaHandoffDetail(params.projectId, params.handoffId);
  if (!detail) throw new NotFoundError("Handoff not found");

  const { handoff, scopeTests, buildId } = detail;
  if (!["ACCEPTED", "IN_PROGRESS"].includes(handoff.status)) {
    throw new ConflictError("Execute tests only on accepted handoffs");
  }
  if (handoff.assignedToUserId !== params.userId) {
    throw new ForbiddenError("Only the assigned QA engineer can record executions for this handoff");
  }
  if (!buildId) throw new ConflictError("Handoff has no build — cannot record execution");

  const row = scopeTests.find((s) => s.testCase.id === params.testCaseId);
  if (!row) throw new ForbiddenError("Test case is not in approved retest scope");
  if (!row.cycleCaseId) {
    throw new ConflictError("Test is not in the active cycle — contact QA lead to add it to the cycle");
  }

  const execution = await prisma.testExecution.create({
    data: {
      testCycleCaseId: row.cycleCaseId,
      buildId,
      executedByUserId: params.userId,
      status: params.status,
      notes: params.notes,
      actualResults: params.actualResults,
      retestScopeId: handoff.retestScopeId,
      qaHandoffId: handoff.id,
      startedAt: new Date(),
      completedAt: new Date(),
    },
    include: { build: { select: { label: true } } },
  });

  if (handoff.status === "ACCEPTED") {
    await prisma.qAHandoff.update({
      where: { id: handoff.id },
      data: { status: "IN_PROGRESS" },
    });
  }

  publishProjectEvent(params.projectId, "execution.recorded", { execution, handoffId: handoff.id });

  const progress = await computeHandoffProgress(params.projectId, handoff.id, buildId, handoff.retestScope.testCaseIds);

  return { execution, progress };
}

export async function completeQaHandoff(params: {
  projectId: string;
  handoffId: string;
  userId: string;
}) {
  const detail = await getQaHandoffDetail(params.projectId, params.handoffId);
  if (!detail) throw new NotFoundError("Handoff not found");
  const { handoff, progress, buildId } = detail;

  if (handoff.assignedToUserId !== params.userId) {
    throw new ForbiddenError("Only the assigned QA engineer can complete this handoff");
  }
  if (!["ACCEPTED", "IN_PROGRESS"].includes(handoff.status)) {
    throw new ConflictError(`Cannot complete handoff in status ${handoff.status}`);
  }
  if (progress.remaining > 0) {
    throw new ConflictError(`${progress.remaining} tests still need execution on the current build`);
  }

  const updated = await prisma.qAHandoff.update({
    where: { id: handoff.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await recordDeliveryEvent({
    projectId: params.projectId,
    changeId: handoff.developerChangeId,
    actorUserId: params.userId,
    kind: "handoff.completed",
    title: `QA handoff completed (${progress.passed} passed, ${progress.failed} failed, ${progress.blocked} blocked)`,
    entityType: "QAHandoff",
    entityId: handoff.id,
  });

  if (progress.failed === 0 && progress.blocked === 0) {
    await prisma.developerChangeRequest.update({
      where: { id: handoff.developerChangeId },
      data: { status: "VERIFIED" },
    });
  }

  publishProjectEvent(params.projectId, "delivery.updated", { changeId: handoff.developerChangeId });
  void notifySwitchDeliveryEvent(
    params.projectId,
    "QA execution completed",
    detail.handoff.developerChange.title,
    "handoff.completed",
  );

  return { handoff: updated, progress };
}
