import { prisma } from "../lib/prisma.js";

export async function getProjectHealthSummary(projectId: string) {
  const activeCycle = await prisma.testCycle.findFirst({
    where: { projectId, status: "ACTIVE" },
    include: {
      release: { include: { builds: { where: { isCurrent: true }, take: 1 } } },
    },
  });

  const testCaseCount = await prisma.testCase.count({
    where: { projectId, archived: false },
  });

  const openDefects = await prisma.defect.count({
    where: { projectId, status: { notIn: ["CLOSED", "REJECTED"] } },
  });

  const criticalDefects = await prisma.defect.count({
    where: {
      projectId,
      status: { notIn: ["CLOSED", "REJECTED"] },
      priority: { in: ["P0", "P1"] },
    },
  });

  if (!activeCycle) {
    return {
      activeRelease: null,
      currentBuild: null,
      testCaseCount,
      pendingTests: 0,
      completedTests: 0,
      failedTests: 0,
      blockedTests: 0,
      openDefects,
      criticalDefects,
    };
  }

  const cases = await prisma.testCycleCase.findMany({
    where: { testCycleId: activeCycle.id },
    include: { assignment: true },
  });

  const failedTests = await prisma.testExecution.count({
    where: {
      testCycleCase: { testCycleId: activeCycle.id },
      status: "FAILED",
    },
  });

  return {
    activeRelease: activeCycle.release,
    currentBuild: activeCycle.release.builds[0] ?? null,
    testCaseCount,
    pendingTests: cases.filter(
      (c) => !c.assignment || ["AVAILABLE", "RELEASED"].includes(c.assignment.status),
    ).length,
    completedTests: cases.filter((c) => c.assignment?.status === "COMPLETED").length,
    blockedTests: cases.filter((c) => c.assignment?.status === "BLOCKED").length,
    failedTests,
    openDefects,
    criticalDefects,
  };
}
