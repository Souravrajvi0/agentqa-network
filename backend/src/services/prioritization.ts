import type { PriorityLevel, TestCase } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type ScoreInput = {
  testCase: TestCase;
  recentModuleChange: boolean;
  defectCount: number;
  failureRate: number;
  requirementChanged: boolean;
  untestedOnBuild: boolean;
  releaseUrgency: number;
};

const defaultWeights = {
  businessCriticality: 12,
  basePriority: 8,
  moduleChange: 25,
  defectHistory: 10,
  failureRate: 15,
  requirementChange: 12,
  untested: 18,
  releaseUrgency: 10,
};

function priorityBase(p: PriorityLevel): number {
  switch (p) {
    case "P0":
      return 4;
    case "P1":
      return 3;
    case "P2":
      return 2;
    default:
      return 1;
  }
}

function scoreToPriority(score: number): PriorityLevel {
  if (score >= 75) return "P0";
  if (score >= 55) return "P1";
  if (score >= 35) return "P2";
  return "P3";
}

export function computePriorityScore(input: ScoreInput, weights = defaultWeights) {
  const reasons: string[] = [];
  let score = 0;

  const bc = input.testCase.businessCriticality;
  score += bc * weights.businessCriticality;
  if (bc >= 4) {
    reasons.push(`Business criticality is ${bc}/5.`);
  }

  score += priorityBase(input.testCase.priority) * weights.basePriority;
  reasons.push(`Baseline priority ${input.testCase.priority}.`);

  if (input.recentModuleChange) {
    score += weights.moduleChange;
    reasons.push("Related module changed in the current release/build.");
  }
  if (input.defectCount > 0) {
    score += Math.min(input.defectCount, 5) * (weights.defectHistory / 2);
    reasons.push(`${input.defectCount} open defect(s) linked to this area.`);
  }
  if (input.failureRate > 0) {
    score += input.failureRate * weights.failureRate;
    reasons.push(`Historical failure rate ${Math.round(input.failureRate * 100)}%.`);
  }
  if (input.requirementChanged) {
    score += weights.requirementChange;
    reasons.push("Linked requirements changed recently.");
  }
  if (input.untestedOnBuild) {
    score += weights.untested;
    reasons.push("Not yet executed on the current build.");
  }
  score += input.releaseUrgency * (weights.releaseUrgency / 2);

  const recommended = scoreToPriority(score);
  return { score, recommended, reasons };
}

export async function refreshCyclePriorities(testCycleId: string) {
  const cycle = await prisma.testCycle.findUnique({
    where: { id: testCycleId },
    include: {
      release: { include: { builds: true } },
      cases: {
        include: {
          testCase: true,
          executions: { orderBy: { createdAt: "desc" }, take: 5 },
          assignment: true,
        },
      },
    },
  });
  if (!cycle) return [];

  const currentBuild = cycle.release.builds.find((b) => b.isCurrent) ?? cycle.release.builds[0];
  const impactedModules = new Set<string>();

  const recentChanges = await prisma.developerChangeRequest.findMany({
    where: {
      projectId: cycle.projectId,
      status: { in: ["SUBMITTED", "APPROVED"] },
      releaseId: cycle.releaseId,
    },
    take: 20,
  });

  for (const c of recentChanges) {
    if (c.impactedTestIds.length) {
      for (const id of c.impactedTestIds) impactedModules.add(id);
    }
  }

  const results = [];
  for (const cycleCase of cycle.cases) {
    const tc = cycleCase.testCase;
    const failedRuns = cycleCase.executions.filter((e) => e.status === "FAILED").length;
    const failureRate =
      cycleCase.executions.length > 0 ? failedRuns / cycleCase.executions.length : 0;

    const defectCount = await prisma.defect.count({
      where: {
        projectId: cycle.projectId,
        testCaseId: tc.id,
        status: { notIn: ["CLOSED", "REJECTED"] },
      },
    });

    const testedOnBuild = currentBuild
      ? cycleCase.executions.some((e) => e.buildId === currentBuild.id && e.status === "PASSED")
      : false;

    const { score, recommended, reasons } = computePriorityScore({
      testCase: tc,
      recentModuleChange:
        recentChanges.some((r) => r.impactedTestIds.includes(tc.id)) ||
        impactedModules.has(tc.id),
      defectCount,
      failureRate,
      requirementChanged: false,
      untestedOnBuild: currentBuild ? !testedOnBuild : true,
      releaseUrgency: cycle.release.status === "ACTIVE" ? 3 : 1,
    });

    const rec = await prisma.priorityRecommendation.create({
      data: {
        testCaseId: tc.id,
        testCycleCaseId: cycleCase.id,
        recommended,
        score,
        reasons,
        source: "SYSTEM",
      },
    });

    await prisma.testCycleCase.update({
      where: { id: cycleCase.id },
      data: { plannedPriority: recommended },
    });

    results.push(rec);
  }

  return results;
}

export async function getPrioritizedQueue(testCycleId: string, limit = 20) {
  const cases = await prisma.testCycleCase.findMany({
    where: { testCycleId },
    include: {
      testCase: true,
      assignment: true,
      recommendations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ plannedPriority: "asc" }, { testCase: { businessCriticality: "desc" } }],
    take: limit,
  });

  return cases.map((c) => ({
    cycleCaseId: c.id,
    testCase: c.testCase,
    assignment: c.assignment,
    recommendation: c.recommendations[0] ?? null,
  }));
}
