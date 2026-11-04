import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { Request } from "express";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import { ForbiddenError, UnauthorizedError } from "./errors.js";
import type { GlobalRole, ProjectRole } from "@prisma/client";

export type JwtPayload = {
  sub: string;
  email: string;
  globalRole: GlobalRole;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

export function hashAgentKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateAgentApiKey(): string {
  return `aq_${crypto.randomBytes(24).toString("hex")}`;
}

export interface AuthContext {
  userId?: string;
  agentId?: string;
  globalRole?: GlobalRole;
}

export function getBearer(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice(7);
}

export async function resolveAuth(req: Request): Promise<AuthContext | null> {
  const token = getBearer(req);
  if (!token) return null;

  if (token.startsWith("aq_")) {
    const hash = hashAgentKey(token);
    const agent = await prisma.agentRegistration.findFirst({
      where: { apiKeyHash: hash, isActive: true },
    });
    if (!agent) throw new UnauthorizedError("Invalid agent API key");
    await prisma.agentRegistration.update({
      where: { id: agent.id },
      data: { lastSeenAt: new Date() },
    });
    return { agentId: agent.id, userId: agent.ownerUserId };
  }

  try {
    const payload = verifyToken(token);
    return { userId: payload.sub, globalRole: payload.globalRole };
  } catch {
    throw new UnauthorizedError("Invalid token");
  }
}

export async function requireUser(req: Request): Promise<AuthContext & { userId: string }> {
  const ctx = await resolveAuth(req);
  if (!ctx?.userId) throw new UnauthorizedError();
  return ctx as AuthContext & { userId: string };
}

/** Rejects agent API keys — approvals and overrides must be human JWT sessions. */
export async function requireHumanUser(req: Request): Promise<AuthContext & { userId: string }> {
  const ctx = await resolveAuth(req);
  if (!ctx?.userId || ctx.agentId) {
    throw new ForbiddenError("Human user session required");
  }
  return ctx as AuthContext & { userId: string };
}

export async function requireProjectRole(
  userId: string,
  projectId: string,
  allowed: ProjectRole[],
): Promise<ProjectRole> {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) throw new ForbiddenError("Not a project member");
  if (!allowed.includes(member.role)) {
    throw new ForbiddenError(`Requires one of: ${allowed.join(", ")}`);
  }
  return member.role;
}
