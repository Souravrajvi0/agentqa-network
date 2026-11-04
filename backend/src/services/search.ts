import { prisma } from "../lib/prisma.js";

export async function searchProjectEntities(projectId: string, q: string, limit = 20) {
  const query = q.trim();
  if (!query) {
    return { testCases: [], defects: [], changes: [], knowledge: [], members: [] };
  }

  const [testCases, defects, changes, knowledge, members] = await Promise.all([
    prisma.testCase.findMany({
      where: {
        projectId,
        archived: false,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { externalId: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, externalId: true, title: true, priority: true },
      take: limit,
    }),
    prisma.defect.findMany({
      where: {
        projectId,
        OR: [
          { summary: { contains: query, mode: "insensitive" } },
          { externalId: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, externalId: true, summary: true, status: true },
      take: limit,
    }),
    prisma.developerChangeRequest.findMany({
      where: {
        projectId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, status: true, urgency: true },
      take: limit,
    }),
    prisma.knowledgeEntry.findMany({
      where: {
        projectId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, type: true },
      take: limit,
    }),
    prisma.projectMember.findMany({
      where: {
        projectId,
        user: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      take: limit,
    }),
  ]);

  return {
    testCases,
    defects,
    changes,
    knowledge,
    members: members.map((m) => ({ id: m.id, role: m.role, user: m.user })),
  };
}

export async function getSwitchIntegrationStatus(projectId: string) {
  const rooms = await prisma.switchRoomLink.findMany({ where: { projectId } });
  const { config } = await import("../lib/config.js");
  const bridgeConfigured = Boolean(
    config.switch.bridgeBaseUrl && config.switch.notifyAgentId && config.switch.notifyAgentApiKey,
  );
  return {
    projectRooms: rooms,
    bridgeConfigured,
    globalRoomConfigured: Boolean(config.switch.roomId),
    status: bridgeConfigured && rooms.length > 0 ? "partial" : bridgeConfigured ? "bridge_only" : "not_configured",
    message: bridgeConfigured
      ? "Bridge credentials present; outbound messages use configured notify agent."
      : "Set SWITCH_BRIDGE_BASE_URL, SWITCH_NOTIFY_AGENT_ID, and SWITCH_NOTIFY_AGENT_API_KEY for live Switch.",
  };
}
