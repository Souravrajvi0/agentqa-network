import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { hashAgentKey, generateAgentApiKey } from "../lib/auth.js";
import { defaultCapabilities } from "../lib/agentCapabilities.js";
import { transitionDeveloperChange } from "../services/developerChanges.js";
import { ForbiddenError } from "../lib/errors.js";
import { tokenForEmail } from "../test/testAuth.js";

const runIntegration =
  process.env.AGENTQA_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);

describe.runIf(runIntegration)("delivery workflow integration", () => {
  const app = createApp();

  it("exposes demo payment authorization expiry change with CI history", async () => {
    const pay = await prisma.project.findUniqueOrThrow({ where: { key: "PAY" } });
    const change = await prisma.developerChangeRequest.findFirst({
      where: { projectId: pay.id, title: { contains: "Payment Authorization Expiry" } },
    });
    expect(change).toBeTruthy();
    const ciRuns = await prisma.ciRun.findMany({ where: { developerChangeId: change!.id } });
    expect(ciRuns.some((r) => r.provider === "DEMO_SEED")).toBe(true);
    expect(ciRuns.some((r) => r.provider === "GITHUB_ACTIONS")).toBe(false);
  });

  it("preserves failed execution on old build while new build has passes", async () => {
    const pay = await prisma.project.findUniqueOrThrow({ where: { key: "PAY" } });
    const failed = await prisma.testExecution.findFirst({
      where: { status: "FAILED", notes: { contains: "[DEMO]" } },
    });
    expect(failed).toBeTruthy();
    const oldBuild = await prisma.build.findFirst({ where: { label: "build-2401" } });
    expect(failed!.buildId).toBe(oldBuild!.id);
    const passOnFix = await prisma.testExecution.count({
      where: { build: { label: "build-2402-fix" }, status: "PASSED", notes: { contains: "Retest passed" } },
    });
    expect(passOnFix).toBeGreaterThan(0);
  });

  it("blocks developer from approving own change", async () => {
    const pay = await prisma.project.findUniqueOrThrow({ where: { key: "PAY" } });
    const lead = await prisma.user.findUniqueOrThrow({ where: { email: "lead@agentqa.demo" } });
    const draft = await prisma.developerChangeRequest.create({
      data: {
        projectId: pay.id,
        authorUserId: lead.id,
        title: "Integration self-approval block",
        description: "QA lead cannot approve own change",
        status: "SUBMITTED",
      },
    });
    await expect(
      transitionDeveloperChange({
        projectId: pay.id,
        changeId: draft.id,
        actorUserId: lead.id,
        toStatus: "APPROVED",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("viewer cannot mutate developer changes via API", async () => {
    const pay = await prisma.project.findUniqueOrThrow({ where: { key: "PAY" } });
    const token = await tokenForEmail("viewer@agentqa.demo");
    const res = await request(app)
      .post(`/api/projects/${pay.id}/developer-changes`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Nope", description: "Viewer cannot create" });
    expect(res.status).toBe(403);
  });

  it("user cannot access another project delivery pipeline", async () => {
    const ecom = await prisma.project.findUniqueOrThrow({ where: { key: "ECOM" } });
    const token = await tokenForEmail("viewer@agentqa.demo");
    const res = await request(app)
      .get(`/api/projects/${ecom.id}/delivery-pipeline`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("agent API key cannot approve retest scope (human session required)", async () => {
    const pay = await prisma.project.findUniqueOrThrow({ where: { key: "PAY" } });
    const dev = await prisma.user.findUniqueOrThrow({ where: { email: "dev.a@agentqa.demo" } });
    const apiKey = generateAgentApiKey();
    await prisma.agentRegistration.create({
      data: {
        projectId: pay.id,
        ownerUserId: dev.id,
        name: `integration-dev-agent-${Date.now()}`,
        displayName: "Integration Dev Agent",
        agentType: "DEVELOPMENT",
        apiKeyHash: hashAgentKey(apiKey),
        apiKeyPrefix: apiKey.slice(0, 10),
        capabilities: defaultCapabilities("DEVELOPMENT"),
      },
    });
    const change = await prisma.developerChangeRequest.findFirstOrThrow({
      where: { projectId: pay.id, title: { contains: "Payment Authorization Expiry" } },
    });
    const scope = await prisma.retestScope.create({
      data: {
        projectId: pay.id,
        developerChangeId: change.id,
        version: 99,
        status: "PROPOSED",
        testCaseIds: [],
        proposedByUserId: dev.id,
      },
    });
    const res = await request(app)
      .post(`/api/projects/${pay.id}/retest-scopes/${scope.id}/approve`)
      .set("Authorization", `Bearer ${apiKey}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it("agent API key cannot override CI gate", async () => {
    const pay = await prisma.project.findUniqueOrThrow({ where: { key: "PAY" } });
    const dev = await prisma.user.findUniqueOrThrow({ where: { email: "dev.a@agentqa.demo" } });
    const apiKey = generateAgentApiKey();
    await prisma.agentRegistration.create({
      data: {
        projectId: pay.id,
        ownerUserId: dev.id,
        name: `integration-ci-agent-${Date.now()}`,
        displayName: "CI Agent",
        agentType: "DEVELOPMENT",
        apiKeyHash: hashAgentKey(apiKey),
        apiKeyPrefix: apiKey.slice(0, 10),
        capabilities: defaultCapabilities("DEVELOPMENT"),
      },
    });
    const failRun = await prisma.ciRun.create({
      data: {
        projectId: pay.id,
        provider: "AGENTQA_SIMULATE",
        repository: "demo/local",
        externalRunId: `sim-agent-${Date.now()}`,
        workflowName: "ci.yml",
        status: "COMPLETED",
        conclusion: "FAILURE",
      },
    });
    const res = await request(app)
      .post(`/api/projects/${pay.id}/ci/overrides`)
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ ciRunId: failRun.id, reason: "agent attempt" });
    expect(res.status).toBe(403);
  });

  it("only one QA engineer can accept a pending handoff", async () => {
    const pay = await prisma.project.findUniqueOrThrow({ where: { key: "PAY" } });
    const dev = await prisma.user.findUniqueOrThrow({ where: { email: "dev.a@agentqa.demo" } });
    const qaA = await prisma.user.findUniqueOrThrow({ where: { email: "qa.b@agentqa.demo" } });
    const qaB = await prisma.user.findUniqueOrThrow({ where: { email: "lead@agentqa.demo" } });
    const change = await prisma.developerChangeRequest.create({
      data: {
        projectId: pay.id,
        authorUserId: dev.id,
        title: "Handoff concurrency test",
        description: "Integration",
        status: "QA_IN_PROGRESS",
      },
    });
    const scope = await prisma.retestScope.create({
      data: {
        projectId: pay.id,
        developerChangeId: change.id,
        version: 1,
        status: "APPROVED",
        testCaseIds: [],
        proposedByUserId: dev.id,
        approvedByUserId: qaB.id,
        approvedAt: new Date(),
      },
    });
    const handoff = await prisma.qAHandoff.create({
      data: {
        projectId: pay.id,
        developerChangeId: change.id,
        retestScopeId: scope.id,
        status: "PENDING",
        summary: "Concurrency",
      },
    });
    const tokenA = await tokenForEmail("qa.b@agentqa.demo");
    const tokenB = await tokenForEmail("lead@agentqa.demo");
    const first = await request(app)
      .post(`/api/projects/${pay.id}/qa-inbox/${handoff.id}/accept`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({});
    expect(first.status).toBe(200);
    const second = await request(app)
      .post(`/api/projects/${pay.id}/qa-inbox/${handoff.id}/accept`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({});
    expect(second.status).toBe(409);
  });

  it("records audit event on CI override", async () => {
    const pay = await prisma.project.findUniqueOrThrow({ where: { key: "PAY" } });
    const leadToken = await tokenForEmail("lead@agentqa.demo");
    const failRun = await prisma.ciRun.create({
      data: {
        projectId: pay.id,
        provider: "AGENTQA_SIMULATE",
        repository: "demo/local",
        externalRunId: `sim-audit-${Date.now()}`,
        workflowName: "ci.yml",
        status: "COMPLETED",
        conclusion: "FAILURE",
      },
    });
    const res = await request(app)
      .post(`/api/projects/${pay.id}/ci/overrides`)
      .set("Authorization", `Bearer ${leadToken}`)
      .send({ ciRunId: failRun.id, reason: "Audit trail test override" });
    expect(res.status).toBe(201);
    const audit = await prisma.auditEvent.findFirst({
      where: { projectId: pay.id, action: "ci_gate.override", entityId: res.body.override.id },
    });
    expect(audit).toBeTruthy();
  });
});
