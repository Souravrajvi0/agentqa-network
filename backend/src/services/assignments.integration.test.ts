import { describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { claimAssignment } from "./assignments.js";
import { ConflictError } from "../lib/errors.js";

const runIntegration = Boolean(process.env.DATABASE_URL);

describe.runIf(runIntegration)("claimAssignment integration", () => {
  it("allows only one concurrent claim on the same assignment", async () => {
    const available = await prisma.testAssignment.findFirst({
      where: { status: "AVAILABLE" },
      include: { testCycleCase: { include: { testCycle: true } } },
    });
    if (!available) return;

    const users = await prisma.user.findMany({
      where: { email: { in: ["qa.b@agentqa.demo", "qa.c@agentqa.demo"] } },
    });
    if (users.length < 2) return;

    await prisma.testAssignment.update({
      where: { id: available.id },
      data: {
        status: "AVAILABLE",
        assigneeUserId: null,
        assigneeAgentId: null,
        lockVersion: { increment: 1 },
      },
    });

    const first = await claimAssignment({ assignmentId: available.id, userId: users[0].id });
    expect(first.status).toBe("CLAIMED");

    await expect(
      claimAssignment({ assignmentId: available.id, userId: users[1].id }),
    ).rejects.toBeInstanceOf(ConflictError);

    await prisma.testAssignment.update({
      where: { id: available.id },
      data: { status: "RELEASED", assigneeUserId: null, lockVersion: { increment: 1 } },
    });
  });
});
