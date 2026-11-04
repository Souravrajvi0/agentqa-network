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
  const heartbeat = await prisma.switchRunnerHeartbeat.findUnique({ where: { projectId } });
  const { config } = await import("../lib/config.js");
  const bridgeConfigured = Boolean(
    config.switch.bridgeBaseUrl && config.switch.notifyAgentId && config.switch.notifyAgentApiKey,
  );
  const runnerConnected =
    heartbeat != null && Date.now() - heartbeat.lastSeenAt.getTime() < 120_000;

  let status: "not_configured" | "incomplete" | "partial" | "active" | "delivery_failing" = "not_configured";
  if (!bridgeConfigured && rooms.length === 0) {
    status = "not_configured";
  } else if (!bridgeConfigured || rooms.length === 0) {
    status = "incomplete";
  } else if (rooms.some((r) => r.lastOutboundOk === false)) {
    status = "delivery_failing";
  } else if (bridgeConfigured && rooms.some((r) => r.enabled)) {
    status = runnerConnected ? "active" : "partial";
  } else {
    status = "partial";
  }

  const lastOutbound = rooms
    .map((r) => r.lastOutboundAt)
    .filter(Boolean)
    .sort((a, b) => (b!.getTime() ?? 0) - (a!.getTime() ?? 0))[0];

  const lastError = rooms.find((r) => r.lastOutboundError)?.lastOutboundError;

  return {
    projectRooms: rooms,
    bridgeConfigured,
    globalRoomConfigured: Boolean(config.switch.roomId),
    runnerConnected,
    runnerLastSeenAt: heartbeat?.lastSeenAt ?? null,
    runnerLabel: heartbeat?.runnerLabel ?? null,
    lastOutboundAt: lastOutbound ?? null,
    lastCommunicationError: lastError ?? null,
    status,
    enabled: rooms.some((r) => r.enabled),
    message: bridgeConfigured
      ? "Bridge credentials present; outbound delivery events use configured notify agent when rooms are linked."
      : "Set SWITCH_BRIDGE_BASE_URL, SWITCH_NOTIFY_AGENT_ID, and SWITCH_NOTIFY_AGENT_API_KEY for live Switch. Link a room below.",
    setupSteps: [
      "Configure SWITCH_BRIDGE_BASE_URL, SWITCH_NOTIFY_AGENT_ID, and SWITCH_NOTIFY_AGENT_API_KEY on the AgentQA server.",
      "Link a Switch room for this project (Admin → Switch integration).",
      "Optionally run @agentqa/switch-agent-runner and POST heartbeats to /api/projects/:id/switch/runner/heartbeat with SWITCH_RUNNER_TOKEN.",
    ],
  };
}
