import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ciBlocksQa } from "./ciRuns.js";

type PipelineFilters = {
  status?: string;
  ciStatus?: string;
  blocked?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function getDeliveryPipeline(projectId: string, filters: PipelineFilters = {}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const where: Prisma.DeveloperChangeRequestWhereInput = {
    projectId,
    ...(filters.status ? { status: filters.status as any } : {}),
  };

  const total = await prisma.developerChangeRequest.count({ where });

  const changes = await prisma.developerChangeRequest.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, email: true } },
      authorAgent: { select: { id: true, displayName: true } },
      feature: true,
      build: true,
    },
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const testMap = new Map<string, { id: string; externalId: string; title: string }>();
  const allTestIds = [...new Set(changes.flatMap((c) => c.impactedTestIds))];
  if (allTestIds.length) {
    const tests = await prisma.testCase.findMany({
      where: { projectId, id: { in: allTestIds } },
      select: { id: true, externalId: true, title: true },
    });
    tests.forEach((t) => testMap.set(t.id, t));
  }

  const rows = await Promise.all(
    changes.map(async (change) => {
      const latestCi = await prisma.ciRun.findFirst({
        where: { projectId, developerChangeId: change.id },
        orderBy: { updatedAt: "desc" },
      });
      const approvedScope = await prisma.retestScope.findFirst({
        where: { developerChangeId: change.id, status: "APPROVED" },
        orderBy: { version: "desc" },
      });
      const handoff = await prisma.qAHandoff.findFirst({
        where: { developerChangeId: change.id },
        orderBy: { createdAt: "desc" },
      });
      const defectCount = await prisma.defect.count({
        where: { projectId, featureId: change.featureId ?? undefined },
      });
      const override = latestCi
        ? await prisma.ciGateOverride.findFirst({ where: { projectId, ciRunId: latestCi.id } })
        : null;
      const overrideActor = override
        ? await prisma.user.findUnique({
            where: { id: override.actorUserId },
            select: { id: true, name: true, email: true },
          })
        : null;
      const timeline = await prisma.deliveryTimelineEvent.findMany({
        where: { projectId, changeId: change.id },
        orderBy: { createdAt: "asc" },
        take: 50,
      });

      const openClarifications = change.featureId
        ? await prisma.designClarification.count({
            where: {
              status: "OPEN",
              designDecision: { featureId: change.featureId, projectId },
            },
          })
        : 0;

      let qaProgress = 0;
      if (approvedScope && approvedScope.testCaseIds.length) {
        const buildId = handoff?.buildId ?? change.buildId;
        if (buildId) {
          const passed = await prisma.testExecution.count({
            where: {
              buildId,
              status: "PASSED",
              testCycleCase: { testCaseId: { in: approvedScope.testCaseIds } },
            },
          });
          qaProgress = Math.round((passed / approvedScope.testCaseIds.length) * 100);
        }
      }

      return {
        change: {
          ...change,
          impactedTests: change.impactedTestIds.map((id) => testMap.get(id)).filter(Boolean),
        },
        latestCi,
        ciGateBlocked: latestCi ? ciBlocksQa(latestCi) && !override : false,
        ciOverride: override ? { ...override, actor: overrideActor } : null,
        approvedScope,
        handoff,
        defectCount,
        openClarifications,
        qaProgress,
        timeline,
        releaseReady: change.status === "VERIFIED" || change.status === "COMPLETED",
      };
    }),
  );

  let filteredRows = rows;
  if (filters.ciStatus) {
    filteredRows = filteredRows.filter((r) => r.latestCi?.status === filters.ciStatus);
  }
  if (filters.blocked) {
    filteredRows = filteredRows.filter((r) => r.ciGateBlocked || r.handoff?.status === "BLOCKED");
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    filteredRows = filteredRows.filter(
      (r) =>
        r.change.title.toLowerCase().includes(q) ||
        r.change.description?.toLowerCase().includes(q) ||
        r.change.author.name.toLowerCase().includes(q),
    );
  }

  return { rows: filteredRows, total, page, pageSize };
}

export async function getDeliveryDetail(projectId: string, changeId: string) {
  const { rows } = await getDeliveryPipeline(projectId);
  const row = rows.find((r) => r.change.id === changeId);
  if (!row) return null;

  const scopes = await prisma.retestScope.findMany({
    where: { developerChangeId: changeId },
    orderBy: { version: "desc" },
  });
  const handoffs = await prisma.qAHandoff.findMany({
    where: { developerChangeId: changeId },
    orderBy: { createdAt: "desc" },
  });
  const ciHistory = await prisma.ciRun.findMany({
    where: { projectId, developerChangeId: changeId },
    orderBy: { createdAt: "desc" },
  });
  const designs = row.change.featureId
    ? await prisma.designDecision.findMany({
        where: { projectId, featureId: row.change.featureId },
        include: { clarifications: true },
      })
    : [];

  return { ...row, scopes, handoffs, ciHistory, designs };
}

export async function getQaInbox(projectId: string, status?: string, assigneeUserId?: string) {
  const handoffs = await prisma.qAHandoff.findMany({
    where: {
      projectId,
      ...(status ? { status: status as any } : { status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS", "BLOCKED"] } }),
      ...(assigneeUserId ? { assignedToUserId: assigneeUserId } : {}),
    },
    include: {
      developerChange: { include: { author: true, feature: true } },
      retestScope: true,
      build: true,
      ciRun: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const enriched = await Promise.all(
    handoffs.map(async (h) => ({
      ...h,
      assignedToUser: h.assignedToUserId
        ? await prisma.user.findUnique({
            where: { id: h.assignedToUserId },
            select: { id: true, name: true, email: true },
          })
        : null,
    })),
  );
  return { handoffs: enriched };
}
