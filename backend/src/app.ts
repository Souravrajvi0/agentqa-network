import express from "express";
import cors from "cors";
import { config } from "./lib/config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { authRouter } from "./routes/auth.js";
import { apiRouter, agentToolsRouter } from "./routes/api.js";
import { githubWebhookRouter } from "./routes/githubWebhook.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(
    "/api/integrations/github/webhook",
    rateLimit({ windowMs: 60_000, max: 120, keyPrefix: "github-webhook" }),
    express.raw({ type: "application/json", limit: "5mb" }),
    githubWebhookRouter,
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "agentqa-backend" });
  });

  app.use("/api/auth", rateLimit({ windowMs: 60_000, max: 40, keyPrefix: "auth" }), authRouter);
  app.use("/api", apiRouter);
  app.use("/api/agent-tools", agentToolsRouter);

  app.use(errorHandler);
  return app;
}
