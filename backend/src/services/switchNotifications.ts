import { prisma } from "../lib/prisma.js";
import { notifySwitchCollaboration } from "./switch.js";
import { logger } from "../lib/logger.js";

const deliveryEventTitles: Record<string, string> = {
  "developer_change.submitted": "Developer change submitted",
  "developer_change.approved": "Change approved",
  "ci.failed": "CI failed",
  "ci.passed": "CI passed",
  "retest_scope.approved": "Retest scope approved",
  "handoff.created": "QA handoff created",
  "handoff.accepted": "QA handoff accepted",
  "handoff.completed": "QA execution completed",
  "defect.created": "Defect created",
  "readiness.changed": "Release readiness changed",
};

export async function notifySwitchDeliveryEvent(
  projectId: string,
  title: string,
  body: string,
  kind?: keyof typeof deliveryEventTitles,
) {
  const rooms = await prisma.switchRoomLink.findMany({
    where: { projectId, enabled: true },
  });
  if (!rooms.length) return { skipped: true as const };

  const displayTitle = kind && deliveryEventTitles[kind] ? deliveryEventTitles[kind] : title;
  let lastError: string | undefined;

  for (const room of rooms) {
    const result = await notifySwitchCollaboration({
      title: displayTitle,
      body,
      roomId: room.roomId,
    });
    await prisma.switchRoomLink.update({
      where: { id: room.id },
      data: {
        lastOutboundAt: new Date(),
        lastOutboundOk: result.ok,
        lastOutboundError: result.ok ? null : (result as { error?: string }).error?.slice(0, 500) ?? "Delivery failed",
      },
    });
    if (!result.ok && !(result as { skipped?: boolean }).skipped) {
      lastError = (result as { error?: string }).error;
    }
  }

  if (lastError) {
    logger.debug({ projectId, lastError }, "Switch notification partial failure");
  }

  return { ok: !lastError };
}
