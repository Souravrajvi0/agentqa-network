import { signToken } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export async function tokenForEmail(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return signToken({ sub: user.id, email: user.email, globalRole: user.globalRole });
}

export async function agentKeyForProject(projectKey: string, agentName: string): Promise<string> {
  const project = await prisma.project.findUniqueOrThrow({ where: { key: projectKey } });
  const agent = await prisma.agentRegistration.findFirstOrThrow({
    where: { projectId: project.id, name: agentName },
  });
  throw new Error("Agent keys are only returned at registration; use pre-seeded AGENTQA_TEST keys in integration tests");
}
