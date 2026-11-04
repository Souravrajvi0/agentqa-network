import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";

/** Post a notification message to a Switch room via the agent bridge (documented agent protocol). */
export async function postSwitchRoomMessage(content: string, roomId?: string) {
  const bridge = config.switch.bridgeBaseUrl.replace(/\/$/, "");
  const agentId = config.switch.notifyAgentId;
  const apiKey = config.switch.notifyAgentApiKey;
  const targetRoom = roomId ?? config.switch.roomId;

  if (!bridge || !agentId || !apiKey || !targetRoom) {
    logger.debug("Switch notify skipped — bridge credentials not configured");
    return { ok: false, skipped: true as const };
  }

  const url = `${bridge}/agents/${agentId}/message`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ room_id: targetRoom, content }),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.warn({ status: res.status, text }, "Switch message failed");
    return { ok: false, error: text };
  }

  return { ok: true };
}

export async function notifySwitchCollaboration(params: {
  title: string;
  body: string;
  roomId?: string;
}) {
  const content = `**${params.title}**\n${params.body}`;
  return postSwitchRoomMessage(content, params.roomId);
}
