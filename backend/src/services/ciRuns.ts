import type { CiConclusion, CiRunStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { recordDeliveryEvent } from "./deliveryTimeline.js";
import { publishProjectEvent } from "../ws/hub.js";

export function mapGitHubWorkflowStatus(status: string, conclusion: string | null): {
  status: CiRunStatus;
  conclusion: CiConclusion | null;
} {
  const s = status.toLowerCase();
  if (s === "queued" || s === "waiting" || s === "pending") {
    return { status: "QUEUED", conclusion: null };
  }
  if (s === "in_progress") {
    return { status: "IN_PROGRESS", conclusion: null };
  }
  if (s !== "completed") {
    return { status: "IN_PROGRESS", conclusion: null };
  }
  const c = (conclusion ?? "").toLowerCase();
  const map: Record<string, CiConclusion> = {
    success: "SUCCESS",
    failure: "FAILURE",
    cancelled: "CANCELLED",
    skipped: "SKIPPED",
    neutral: "NEUTRAL",
    timed_out: "TIMED_OUT",
    action_required: "ACTION_REQUIRED",
  };
  return { status: "COMPLETED", conclusion: map[c] ?? "NEUTRAL" };
}

export async function upsertCiRunFromGitHub(params: {
  projectId: string;
  repository: string;
  externalRunId: string;
  deliveryId?: string;
  workflowName: string;
  workflowUrl?: string;
  branch?: string;
  commitSha?: string;
  status: CiRunStatus;
  conclusion: CiConclusion | null;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}) {
  const existing = await prisma.ciRun.findUnique({
    where: {
      projectId_provider_externalRunId: {
        projectId: params.projectId,
        provider: "GITHUB_ACTIONS",
        externalRunId: params.externalRunId,
      },
    },
  });

  if (existing) {
    if (existing.status === "COMPLETED" && params.status !== "COMPLETED") {
      return existing;
    }
    const existingMeta = (existing.metadata ?? {}) as { runNumber?: number };
    const incomingRunNumber =
      typeof params.metadata?.runNumber === "number" ? params.metadata.runNumber : undefined;
    if (
      incomingRunNumber !== undefined &&
      existingMeta.runNumber !== undefined &&
      incomingRunNumber < existingMeta.runNumber
    ) {
      return existing;
    }
  }

  let developerChangeId: string | undefined;
  if (params.commitSha) {
    const change = await prisma.developerChangeRequest.findFirst({
      where: {
        projectId: params.projectId,
        OR: [{ commitSha: params.commitSha }, { branch: params.branch ?? undefined }],
      },
      orderBy: { updatedAt: "desc" },
    });
    developerChangeId = change?.id;
  }

  let buildId: string | undefined;
  const activeRelease = await prisma.release.findFirst({
    where: { projectId: params.projectId, status: "ACTIVE" },
  });
  if (activeRelease && params.commitSha && params.conclusion === "SUCCESS") {
    const label = `gh-${params.externalRunId}`;
    const build = await prisma.build.upsert({
      where: { releaseId_label: { releaseId: activeRelease.id, label } },
      create: {
        releaseId: activeRelease.id,
        label,
        gitRef: params.commitSha,
        commitSha: params.commitSha,
        branch: params.branch,
        repository: params.repository,
        sourceProvider: "GITHUB_ACTIONS",
        isCurrent: false,
      },
      update: {
        commitSha: params.commitSha,
        branch: params.branch,
        repository: params.repository,
      },
    });
    buildId = build.id;
  }

  const run = await prisma.ciRun.upsert({
    where: {
      projectId_provider_externalRunId: {
        projectId: params.projectId,
        provider: "GITHUB_ACTIONS",
        externalRunId: params.externalRunId,
      },
    },
    create: {
      projectId: params.projectId,
      developerChangeId,
      buildId,
      repository: params.repository,
      externalRunId: params.externalRunId,
      deliveryId: params.deliveryId,
      workflowName: params.workflowName,
      workflowUrl: params.workflowUrl,
      branch: params.branch,
      commitSha: params.commitSha,
      status: params.status,
      conclusion: params.conclusion ?? undefined,
      startedAt: params.startedAt,
      completedAt: params.completedAt,
      metadata: params.metadata as object,
    },
    update: {
      developerChangeId,
      buildId,
      workflowUrl: params.workflowUrl,
      status: params.status,
      conclusion: params.conclusion ?? undefined,
      completedAt: params.completedAt,
      metadata: params.metadata as object,
    },
  });

  if (developerChangeId && params.status === "COMPLETED") {
    const nextStatus =
      params.conclusion === "SUCCESS" ? "QA_PENDING" : params.conclusion === "FAILURE" ? "CI_PENDING" : undefined;
    if (nextStatus) {
      await prisma.developerChangeRequest.updateMany({
        where: { id: developerChangeId, status: { in: ["SUBMITTED", "IN_REVIEW", "APPROVED", "CI_PENDING"] } },
        data: { status: nextStatus === "QA_PENDING" ? "QA_PENDING" : "CI_PENDING", buildId: buildId ?? undefined },
      });
    }
  }

  await recordDeliveryEvent({
    projectId: params.projectId,
    changeId: developerChangeId,
    actorType: "HUMAN",
    kind: "ci.updated",
    title: `CI ${params.workflowName}: ${params.status}${params.conclusion ? ` (${params.conclusion})` : ""}`,
    entityType: "CiRun",
    entityId: run.id,
  });

  publishProjectEvent(params.projectId, "ci.updated", { ciRun: run });
  return run;
}

export function ciBlocksQa(run: {
  status: string;
  conclusion: string | null;
}): boolean {
  if (run.status === "QUEUED" || run.status === "IN_PROGRESS") return true;
  if (run.status === "COMPLETED" && run.conclusion === "SUCCESS") return false;
  if (run.status === "COMPLETED" && run.conclusion === "SKIPPED") return true;
  if (run.status === "COMPLETED" && run.conclusion === "FAILURE") return true;
  return true;
}
