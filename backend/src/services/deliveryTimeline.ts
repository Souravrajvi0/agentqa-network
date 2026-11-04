import type { ActorType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function recordDeliveryEvent(params: {
  projectId: string;
  changeId?: string;
  actorUserId?: string;
  actorAgentId?: string;
  actorType?: ActorType;
  kind: string;
  title: string;
  description?: string;
  entityType?: string;
  entityId?: string;
}) {
  return prisma.deliveryTimelineEvent.create({
    data: {
      projectId: params.projectId,
      changeId: params.changeId,
      actorUserId: params.actorUserId,
      actorAgentId: params.actorAgentId,
      actorType: params.actorType ?? "HUMAN",
      kind: params.kind,
      title: params.title,
      description: params.description,
      entityType: params.entityType,
      entityId: params.entityId,
    },
  });
}
