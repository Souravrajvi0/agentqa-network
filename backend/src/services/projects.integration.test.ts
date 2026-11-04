import { describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { getProjectHealthSummary } from "./projectStats.js";

const runIntegration =
  process.env.AGENTQA_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);

describe.runIf(runIntegration)("projects integration", () => {
  it("returns health summary for seeded PAY project", async () => {
    const pay = await prisma.project.findUnique({ where: { key: "PAY" } });
    expect(pay).toBeTruthy();
    const health = await getProjectHealthSummary(pay!.id);
    expect(health.testCaseCount).toBeGreaterThan(0);
    expect(health.activeRelease).toBeTruthy();
  });

  it("lists multiple demo projects after seed", async () => {
    const keys = await prisma.project.findMany({ select: { key: true }, orderBy: { key: "asc" } });
    expect(keys.map((k) => k.key)).toEqual(expect.arrayContaining(["ECOM", "IDP", "PAY"]));
  });

  it("scopes qa.b to different roles per project", async () => {
    const user = await prisma.user.findUnique({ where: { email: "qa.b@agentqa.demo" } });
    expect(user).toBeTruthy();
    const memberships = await prisma.projectMember.findMany({
      where: { userId: user!.id },
      include: { project: { select: { key: true } } },
    });
    const byKey = Object.fromEntries(memberships.map((m) => [m.project.key, m.role]));
    expect(byKey.PAY).toBe("QA_ENGINEER");
    expect(byKey.ECOM).toBe("QA_LEAD");
  });
});
