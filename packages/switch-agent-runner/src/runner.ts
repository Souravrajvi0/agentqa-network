/**
 * Minimal Switch agent bridge client.
 * Connects to Switch agent WebSocket and reacts to addressed messages by calling AgentQA MCP-equivalent REST tools.
 *
 * Requires env:
 * - SWITCH_BRIDGE_BASE_URL
 * - SWITCH_AGENT_ID
 * - SWITCH_AGENT_API_KEY
 * - AGENTQA_AGENT_API_KEY
 * - AGENTQA_API_URL
 */
import WebSocket from "ws";
import crypto from "crypto";

const bridge = (process.env.SWITCH_BRIDGE_BASE_URL ?? "").replace(/\/$/, "");
const agentId = process.env.SWITCH_AGENT_ID ?? "";
const agentKey = process.env.SWITCH_AGENT_API_KEY ?? "";
const agentqaKey = process.env.AGENTQA_AGENT_API_KEY ?? "";
const agentqaUrl = (process.env.AGENTQA_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

if (!bridge || !agentId || !agentKey) {
  console.error("Switch bridge env vars missing");
  process.exit(1);
}

const connectionId = process.env.SWITCH_CONNECTION_ID ?? crypto.randomUUID();

async function agentqa(path: string, init?: RequestInit) {
  const res = await fetch(`${agentqaUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${agentqaKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return { ok: res.ok, body: await res.text() };
}

function wsUrl(roomIds: string[]) {
  const rooms = roomIds.join(",");
  return `${bridge.replace(/^http/, "ws")}/agents/${agentId}/connection/ws?connection_id=${connectionId}&rooms=${encodeURIComponent(rooms)}`;
}

async function handleAddressedMessage(content: string) {
  const lower = content.toLowerCase();
  if (lower.includes("queue") || lower.includes("priority")) {
    const r = await agentqa("/api/agent-tools/test-queue");
    await postSwitchMessage(`AgentQA queue:\n${r.body.slice(0, 3500)}`);
  } else if (lower.includes("coordination") || lower.includes("critical")) {
    const q = await agentqa("/api/agent-tools/test-queue");
    const parsed = JSON.parse(q.body) as { projectId?: string };
    if (parsed.projectId) {
      const r = await agentqa(`/api/projects/${parsed.projectId}/coordination/scan`, {
        method: "POST",
        body: "{}",
      });
      await postSwitchMessage(`Coordination scan:\n${r.body}`);
    }
  }
}

async function postSwitchMessage(content: string) {
  await fetch(`${bridge}/agents/${agentId}/message`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${agentKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      room_id: process.env.SWITCH_ROOM_ID,
      content,
    }),
  });
}

const roomId = process.env.SWITCH_ROOM_ID ?? "";
const ws = new WebSocket(wsUrl(roomId ? [roomId] : []), {
  headers: { Authorization: `Bearer ${agentKey}` },
});

ws.on("open", () => console.log("Switch agent connected"));
ws.on("message", async (raw) => {
  try {
    const frame = JSON.parse(raw.toString()) as {
      type?: string;
      payload?: { addressed?: boolean; content?: string };
      cursor?: string;
    };
    if (frame.type === "ping" && frame.cursor) {
      ws.send(JSON.stringify({ type: "pong", cursor: frame.cursor }));
    }
    if (frame.type === "message" && frame.payload?.addressed && frame.payload.content) {
      await handleAddressedMessage(frame.payload.content);
    }
  } catch (e) {
    console.error("frame error", e);
  }
});

ws.on("close", () => {
  console.log("Switch connection closed");
  process.exit(0);
});
