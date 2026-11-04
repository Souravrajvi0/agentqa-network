import dotenv from "dotenv";

dotenv.config({ path: new URL("../../.env", import.meta.url).pathname });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  logLevel: process.env.LOG_LEVEL ?? "info",
  switch: {
    bridgeBaseUrl: process.env.SWITCH_BRIDGE_BASE_URL ?? "",
    roomId: process.env.SWITCH_ROOM_ID ?? "",
    notifyAgentId: process.env.SWITCH_NOTIFY_AGENT_ID ?? "",
    notifyAgentApiKey: process.env.SWITCH_NOTIFY_AGENT_API_KEY ?? "",
  },
  uploadsDir: new URL("../../uploads", import.meta.url).pathname,
  automationDir: new URL("../../automation", import.meta.url).pathname,
};
