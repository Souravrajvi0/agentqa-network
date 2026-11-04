import http from "http";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { config } from "./lib/config.js";
import { logger } from "./lib/logger.js";
import { createApp } from "./app.js";
import { realtimeHub } from "./ws/hub.js";
import { verifyToken } from "./lib/auth.js";
import { userCanAccessProject } from "./lib/projectAccess.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = createApp();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const token = url.searchParams.get("token");
  let userId: string | undefined;

  if (token) {
    try {
      userId = verifyToken(token).sub;
    } catch {
      ws.close(4401, "Unauthorized");
      return;
    }
  }

  const client = realtimeHub.addClient(ws, userId);

  ws.on("message", (raw) => {
    void (async () => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; projectId?: string };
        if (msg.type === "subscribe" && msg.projectId) {
          if (!userId) {
            ws.send(JSON.stringify({ type: "error", message: "Authentication required" }));
            return;
          }
          const allowed = await userCanAccessProject(userId, msg.projectId);
          if (!allowed) {
            ws.send(JSON.stringify({ type: "error", message: "Project access denied" }));
            return;
          }
          realtimeHub.subscribe(client, msg.projectId);
          ws.send(JSON.stringify({ type: "subscribed", projectId: msg.projectId }));
        }
      } catch {
        /* ignore malformed */
      }
    })();
  });

  ws.send(JSON.stringify({ type: "connected" }));
});

server.listen(config.port, () => {
  logger.info(`AgentQA backend listening on :${config.port}`);
});
