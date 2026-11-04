import type { WebSocket } from "ws";

export type RealtimeEvent = {
  type: string;
  projectId: string;
  payload: unknown;
};

type Client = {
  ws: WebSocket;
  userId?: string;
  projectIds: Set<string>;
};

class RealtimeHub {
  private clients = new Set<Client>();

  addClient(ws: WebSocket, userId?: string) {
    const client: Client = { ws, userId, projectIds: new Set() };
    this.clients.add(client);
    ws.on("close", () => this.clients.delete(client));
    return client;
  }

  subscribe(client: Client, projectId: string) {
    client.projectIds.add(projectId);
  }

  publish(event: RealtimeEvent) {
    const data = JSON.stringify(event);
    for (const client of this.clients) {
      if (!client.projectIds.has(event.projectId)) continue;
      if (client.ws.readyState === client.ws.OPEN) {
        client.ws.send(data);
      }
    }
  }
}

export const realtimeHub = new RealtimeHub();

export function publishProjectEvent(
  projectId: string,
  type: string,
  payload: unknown,
) {
  realtimeHub.publish({ type, projectId, payload });
}
