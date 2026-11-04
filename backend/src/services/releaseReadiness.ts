import { prisma } from "../lib/prisma.js";
import { ciBlocksQa } from "./ciRuns.js";

export async function evaluateReleaseReadiness(projectId: string) {
  const evaluatedAt = new Date();

  const activeCycle = await prisma.testCycle.findFirst({
    where: { projectId, status: "ACTIVE" },
    include: { release: { include: { builds: true } } },
  });

  if (!activeCycle) {
    return {
      ready: false,
      overall: "NOT_READY",
      ciGate: { passed: false, reason: "No active test cycle" },
      qaGate: { passed: false, reason: "No active test cycle" },
      defectGate: { passed: true },
      blockers: ["Create or activate a test cycle"],
      warnings: [] as string[],
      evidence: [] as string[],
      evaluatedAt,
      disclaimer: "Human release approval is required regardless of automated readiness.",
    };
  }

  const currentBuild = activeCycle.release.builds.find((b) => b.isCurrent) ?? null;

  const latestCi = currentBuild?.commitSha
    ? await prisma.ciRun.findFirst({
        where: { projectId, commitSha: currentBuild.commitSha },
        orderBy: { updatedAt: "desc" },
      })
    : await prisma.ciRun.findFirst({
        where: { projectId },
        orderBy: { updatedAt: "desc" },
      });

  const ciOverride = latestCi
    ? await prisma.ciGateOverride.findFirst({
        where: { projectId, ciRunId: latestCi.id },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const ciBlocked = latestCi ? ciBlocksQa(latestCi) && !ciOverride : false;
  const ciGatePassed = latestCi?.conclusion === "SUCCESS" || !!ciOverride;

  const cases = await prisma.testCycleCase.findMany({
    where: { testCycleId: activeCycle.id, plannedPriority: { in: ["P0", "P1"] } },
    include: {
      assignment: true,
      testCase: true,
      executions: currentBuild
        ? {
            where: { buildId: currentBuild.id },
            orderBy: { createdAt: "desc" },
            take: 1,
          }
        : { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const incompleteCritical = cases.filter((c) => c.assignment?.status !== "COMPLETED");
  const staleOrMissing = cases.filter((c) => {
    if (!currentBuild) return true;
    const latest = c.executions[0];
    if (!latest) return true;
    if (latest.status === "FAILED" || latest.status === "BLOCKED") return true;
    if (latest.buildId !== currentBuild.id) return true;
    return false;
  });

  const openDefects = await prisma.defect.count({
    where: { projectId, status: { notIn: ["CLOSED", "REJECTED"] }, priority: { in: ["P0", "P1"] } },
  });

  const openClarifications = await prisma.designClarification.count({
    where: { status: "OPEN", designDecision: { projectId } },
  });

  const outstandingChanges = await prisma.developerChangeRequest.count({
    where: {
      projectId,
      status: { in: ["SUBMITTED", "IN_REVIEW", "CI_PENDING", "QA_PENDING", "QA_IN_PROGRESS"] },
    },
  });

  const blockers: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  if (ciBlocked) {
    blockers.push(
      latestCi
        ? `CI ${latestCi.workflowName} is ${latestCi.status}${latestCi.conclusion ? ` (${latestCi.conclusion})` : ""}`
        : "No successful CI run recorded for current build",
    );
  } else if (ciOverride) {
    warnings.push(`CI gate overridden: ${ciOverride.reason}`);
    evidence.push(`ciOverride:${ciOverride.id}`);
  } else if (latestCi?.conclusion === "SUCCESS") {
    evidence.push(`ciRun:${latestCi.id}`);
  }

  if (incompleteCritical.length) {
    blockers.push(`${incompleteCritical.length} critical/high assignments not completed`);
  }
  if (currentBuild && staleOrMissing.length) {
    blockers.push(
      `${staleOrMissing.length} critical tests lack passing execution on build ${currentBuild.label}`,
    );
  }
  if (openDefects) blockers.push(`${openDefects} open P0/P1 defects`);
  if (openClarifications) warnings.push(`${openClarifications} open design clarifications`);
  if (outstandingChanges) warnings.push(`${outstandingChanges} developer changes still in flight`);

  const qaGatePassed = blockers.filter((b) => !b.startsWith("CI")).length === 0 && staleOrMissing.length === 0;
  const defectGatePassed = openDefects === 0;
  const ready = blockers.length === 0;

  return {
    ready,
    overall: ready ? "READY" : "NOT_READY",
    ciGate: {
      passed: ciGatePassed,
      blocked: ciBlocked,
      run: latestCi,
      override: ciOverride,
    },
    qaGate: {
      passed: qaGatePassed,
      incompleteCritical: incompleteCritical.map((c) => c.testCase.externalId),
      staleOnCurrentBuild: staleOrMissing.map((c) => c.testCase.externalId),
    },
    defectGate: { passed: defectGatePassed, openCriticalCount: openDefects },
    release: activeCycle.release,
    currentBuild,
    blockers,
    warnings,
    evidence,
    openClarifications,
    outstandingChanges,
    evaluatedAt,
    disclaimer:
      "Readiness uses CI status, approved-scope execution evidence on the current build, defects, clarifications, and in-flight changes. Human approval is still required.",
  };
}
