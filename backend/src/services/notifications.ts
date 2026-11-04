import { prisma } from "../lib/prisma.js";
import type { NotificationType, Prisma } from "@prisma/client";
import { publishProjectEvent } from "../ws/hub.js";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkPath?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      linkPath: params.linkPath,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  if (params.projectId) {
    publishProjectEvent(params.projectId, "notification.created", {
      userId: params.userId,
      notification,
    });
  }

  return notification;
}

export async function notifyProjectLeads(
  projectId: string,
  params: Omit<Parameters<typeof createNotification>[0], "userId">,
) {
  const leads = await prisma.projectMember.findMany({
    where: { projectId, role: { in: ["QA_LEAD", "ADMINISTRATOR"] } },
  });
  for (const lead of leads) {
    await createNotification({ ...params, userId: lead.userId, projectId });
  }
}
