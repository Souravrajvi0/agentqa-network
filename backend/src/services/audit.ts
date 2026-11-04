import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function recordAudit(params: {
  userId?: string;
  agentId?: string;
  projectId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  return prisma.auditEvent.create({
    data: {
      userId: params.userId,
      agentId: params.agentId,
      projectId: params.projectId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details as Prisma.InputJsonValue | undefined,
    },
  });
}
