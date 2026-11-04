import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { config } from "./lib/config.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.js";
import { apiRouter, agentToolsRouter } from "./routes/api.js";
import { realtimeHub } from "./ws/hub.js";
import { verifyToken } from "./lib/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "agentqa-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api", apiRouter);
app.use("/api/agent-tools", agentToolsRouter);

app.use(errorHandler);

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
    try {
      const msg = JSON.parse(raw.toString()) as { type: string; projectId?: string };
      if (msg.type === "subscribe" && msg.projectId) {
        realtimeHub.subscribe(client, msg.projectId);
        ws.send(JSON.stringify({ type: "subscribed", projectId: msg.projectId }));
      }
    } catch {
      /* ignore malformed */
    }
  });

  ws.send(JSON.stringify({ type: "connected" }));
});

server.listen(config.port, () => {
  logger.info(`AgentQA backend listening on :${config.port}`);
});
