import {
  PrismaClient,
  PriorityLevel,
  DesignDecisionStatus,
  GlobalRole,
  ProjectRole,
  AgentType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.deliveryTimelineEvent.deleteMany();
  await prisma.ciGateOverride.deleteMany();
  await prisma.inboundWebhookDelivery.deleteMany();
  await prisma.testExecution.deleteMany();
  await prisma.qAHandoff.deleteMany();
  await prisma.retestScope.deleteMany();
  await prisma.ciRun.deleteMany();
  await prisma.gitHubProjectIntegration.deleteMany();
  await prisma.agentActivity.deleteMany();
  await prisma.testEvidence.deleteMany();
  await prisma.testAssignment.deleteMany();
  await prisma.priorityHistory.deleteMany();
  await prisma.priorityRecommendation.deleteMany();
  await prisma.testCycleCase.deleteMany();
  await prisma.testCycle.deleteMany();
  await prisma.designClarification.deleteMany();
  await prisma.designDecisionHistory.deleteMany();
  await prisma.designDecisionTestCase.deleteMany();
  await prisma.designDecision.deleteMany();
  await prisma.developerChangeRequest.deleteMany();
  await prisma.defect.deleteMany();
  await prisma.knowledgeEntry.deleteMany();
  await prisma.testCaseVersion.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.feature.deleteMany();
  await prisma.appModule.deleteMany();
  await prisma.build.deleteMany();
  await prisma.release.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.agentRegistration.deleteMany();
  await prisma.switchRoomLink.deleteMany();
  await prisma.priorityRuleConfig.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@agentqa.demo",
      name: "Alex Admin",
      passwordHash,
      globalRole: GlobalRole.ADMINISTRATOR,
    },
  });

  const qaLead = await prisma.user.create({
    data: {
      email: "lead@agentqa.demo",
      name: "Jordan Lead",
      passwordHash,
      globalRole: GlobalRole.QA_LEAD,
    },
  });

  const qaB = await prisma.user.create({
    data: {
      email: "qa.b@agentqa.demo",
      name: "Sam QA",
      passwordHash,
      globalRole: GlobalRole.QA_ENGINEER,
    },
  });

  const qaC = await prisma.user.create({
    data: {
      email: "qa.c@agentqa.demo",
      name: "Taylor QA",
      passwordHash,
      globalRole: GlobalRole.QA_ENGINEER,
    },
  });

  const qaD = await prisma.user.create({
    data: {
      email: "qa.d@agentqa.demo",
      name: "Riley Manual",
      passwordHash,
      globalRole: GlobalRole.QA_ENGINEER,
    },
  });

  const devA = await prisma.user.create({
    data: {
      email: "dev.a@agentqa.demo",
      name: "Dev A",
      passwordHash,
      globalRole: GlobalRole.DEVELOPER,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: "viewer@agentqa.demo",
      name: "Vera Viewer",
      passwordHash,
      globalRole: GlobalRole.QA_ENGINEER,
    },
  });

  const project = await prisma.project.create({
    data: {
      key: "PAY",
      name: "Payments Platform",
      description: "Flip the Switch hackathon demo project for AgentQA Network",
      members: {
        create: [
          { userId: admin.id, role: ProjectRole.ADMINISTRATOR },
          { userId: qaLead.id, role: ProjectRole.QA_LEAD },
          { userId: qaB.id, role: ProjectRole.QA_ENGINEER },
          { userId: qaC.id, role: ProjectRole.QA_ENGINEER },
          { userId: qaD.id, role: ProjectRole.QA_ENGINEER },
          { userId: devA.id, role: ProjectRole.DEVELOPER },
          { userId: viewer.id, role: ProjectRole.VIEWER },
        ],
      },
      priorityRules: {
        create: {
          weights: {
            businessCriticality: 12,
            moduleChange: 25,
            untested: 18,
          },
        },
      },
    },
  });

  const authModule = await prisma.appModule.create({
    data: { projectId: project.id, name: "Authentication", description: "Login and access control" },
  });

  const permFeature = await prisma.feature.create({
    data: {
      projectId: project.id,
      moduleId: authModule.id,
      name: "Permission validation",
      description: "Restricted user and admin override flows",
    },
  });

  const reqAuth = await prisma.requirement.create({
    data: {
      projectId: project.id,
      externalId: "REQ-AUTH-01",
      title: "Restricted users cannot access admin routes",
    },
  });

  const release = await prisma.release.create({
    data: {
      projectId: project.id,
      name: "November Release",
      version: "2.4.0",
      status: "ACTIVE",
      targetDate: new Date("2026-11-15"),
    },
  });

  const build = await prisma.build.create({
    data: {
      releaseId: release.id,
      label: "build-2401",
      gitRef: "main@a1b2c3d",
      isCurrent: true,
    },
  });

  await prisma.environment.create({
    data: {
      projectId: project.id,
      name: "Staging",
      baseUrl: "https://staging.payments.demo",
    },
  });

  const testCaseDefs = [
    {
      externalId: "TC-101",
      title: "Admin login succeeds with valid credentials",
      priority: PriorityLevel.P1,
      businessCriticality: 4,
      automationAvailable: true,
      automationCommand: "smoke-login",
      steps: [{ step: 1, action: "Open login", expected: "Form visible" }],
    },
    {
      externalId: "TC-105",
      title: "Restricted user blocked from admin panel",
      priority: PriorityLevel.P0,
      businessCriticality: 5,
      automationAvailable: true,
      automationCommand: "smoke-dashboard",
      steps: [{ step: 1, action: "Login as restricted user", expected: "403 on /admin" }],
    },
    {
      externalId: "TC-110",
      title: "Admin override grants temporary elevated access",
      priority: PriorityLevel.P1,
      businessCriticality: 4,
      automationAvailable: false,
      automationCommand: null,
      steps: [{ step: 1, action: "Trigger override", expected: "Time-bound access" }],
    },
    {
      externalId: "TC-120",
      title: "Session timeout logs user out",
      priority: PriorityLevel.P2,
      businessCriticality: 3,
      automationAvailable: false,
      automationCommand: null,
      steps: [{ step: 1, action: "Wait for timeout", expected: "Redirect login" }],
    },
    {
      externalId: "TC-130",
      title: "Audit log records permission changes",
      priority: PriorityLevel.P2,
      businessCriticality: 3,
      automationAvailable: false,
      automationCommand: null,
      steps: [{ step: 1, action: "Change role", expected: "Audit entry" }],
    },
  ] as const;

  const testCases = [];
  for (const def of testCaseDefs) {
    const tc = await prisma.testCase.create({
      data: {
        projectId: project.id,
        moduleId: authModule.id,
        featureId: permFeature.id,
        externalId: def.externalId,
        title: def.title,
        description: `Validates ${def.title.toLowerCase()}`,
        preconditions: "Staging environment available",
        steps: def.steps,
        expectedResults: "Behavior matches approved design",
        priority: def.priority,
        businessCriticality: def.businessCriticality,
        tags: ["auth", "release-2.4"],
        automationAvailable: def.automationAvailable,
        automationCommand: def.automationCommand ?? undefined,
        requirements: { connect: def.externalId === "TC-105" ? [{ id: reqAuth.id }] : [] },
      },
    });
    testCases.push(tc);
  }

  const decision = await prisma.designDecision.create({
    data: {
      projectId: project.id,
      externalId: "DD-014",
      title: "Admin override is intentional elevated access",
      description: "Administrators may grant temporary elevated access with audit trail",
      rationale: "Support break-glass operations without permanent role changes",
      expectedBehavior:
        "Override shows banner, expires in 15 minutes, and writes audit event",
      featureId: permFeature.id,
      authorUserId: devA.id,
      approverUserId: qaLead.id,
      status: DesignDecisionStatus.APPROVED,
      effectiveVersion: "2.4.0",
      testCases: {
        create: [{ testCaseId: testCases.find((t) => t.externalId === "TC-110")!.id }],
      },
    },
  });

  const cycle = await prisma.testCycle.create({
    data: {
      projectId: project.id,
      releaseId: release.id,
      name: "RC1 Regression",
      description: "Release candidate validation cycle",
      status: "ACTIVE",
    },
  });

  for (const tc of testCases) {
    const cycleCase = await prisma.testCycleCase.create({
      data: {
        testCycleId: cycle.id,
        testCaseId: tc.id,
        plannedPriority: tc.priority,
      },
    });

    await prisma.testAssignment.create({
      data: {
        testCycleCaseId: cycleCase.id,
        status: "AVAILABLE",
      },
    });
  }

  await prisma.knowledgeEntry.create({
    data: {
      projectId: project.id,
      type: "TESTING_NOTE",
      title: "Restricted user test data",
      content: "Use account restricted@demo / pass123 on staging for TC-105",
      testCaseId: testCases.find((t) => t.externalId === "TC-105")!.id,
      authorUserId: qaB.id,
    },
  });

  const paymentsModule = await prisma.appModule.create({
    data: {
      projectId: project.id,
      name: "Payments",
      description: "Authorization, capture, and settlement",
    },
  });

  const authExpFeature = await prisma.feature.create({
    data: {
      projectId: project.id,
      moduleId: paymentsModule.id,
      name: "Payment Authorization Expiry",
      description: "Time-bound authorization holds for card payments",
    },
  });

  const payTestDefs = [
    { externalId: "TC-PAY-01", title: "Authorization hold created with correct TTL" },
    { externalId: "TC-PAY-02", title: "Expired authorization cannot be captured" },
    { externalId: "TC-PAY-03", title: "Expiry warning shown before hold ends" },
    { externalId: "TC-PAY-04", title: "Capture succeeds before expiry" },
    { externalId: "TC-PAY-05", title: "Audit event records authorization expiry" },
  ] as const;

  const payTestCases = [];
  for (const def of payTestDefs) {
    const tc = await prisma.testCase.create({
      data: {
        projectId: project.id,
        moduleId: paymentsModule.id,
        featureId: authExpFeature.id,
        externalId: def.externalId,
        title: def.title,
        description: `[DEMO] ${def.title}`,
        steps: [{ step: 1, action: "Execute scenario", expected: "Matches design" }],
        expectedResults: "Matches approved design DD-PAY-AUTH-EXP",
        priority: PriorityLevel.P1,
        businessCriticality: 4,
        tags: ["demo", "payments", "auth-expiry"],
      },
    });
    payTestCases.push(tc);
    const cycleCase = await prisma.testCycleCase.create({
      data: { testCycleId: cycle.id, testCaseId: tc.id, plannedPriority: tc.priority },
    });
    await prisma.testAssignment.create({
      data: { testCycleCaseId: cycleCase.id, status: "AVAILABLE" },
    });
  }

  const authExpDecision = await prisma.designDecision.create({
    data: {
      projectId: project.id,
      externalId: "DD-PAY-AUTH-EXP",
      title: "[DEMO] Authorization expiry behavior",
      description: "Demo design decision for Payment Authorization Expiry delivery walkthrough",
      rationale: "Customers must see warnings and cannot capture after expiry",
      expectedBehavior:
        "Hold expires after 15 minutes; UI shows countdown; capture after expiry returns AUTH_EXPIRED",
      featureId: authExpFeature.id,
      authorUserId: devA.id,
      approverUserId: qaLead.id,
      status: DesignDecisionStatus.APPROVED,
      effectiveVersion: "2.4.0",
      testCases: {
        create: payTestCases.map((tc) => ({ testCaseId: tc.id })),
      },
    },
  });

  const buildFix = await prisma.build.create({
    data: {
      releaseId: release.id,
      label: "build-2402-fix",
      gitRef: "main@expiry-fix-9f2",
      commitSha: "expiry-fix-9f2",
      branch: "fix/auth-expiry-warning",
      repository: "demo/payments-api",
      sourceProvider: "DEMO_SEED",
      isCurrent: true,
    },
  });

  await prisma.build.update({
    where: { id: build.id },
    data: { isCurrent: false, sourceProvider: "DEMO_SEED", commitSha: "expiry-feature-7d1" },
  });

  const retestTestIds = [...testCases.slice(0, 5).map((t) => t.id), ...payTestCases.map((t) => t.id)];

  const payChange = await prisma.developerChangeRequest.create({
    data: {
      projectId: project.id,
      releaseId: release.id,
      buildId: buildFix.id,
      featureId: authExpFeature.id,
      authorUserId: devA.id,
      title: "[DEMO] Payment Authorization Expiry",
      description:
        "Demo delivery workflow (seeded data — not from GitHub). Implements shorter authorization TTL and UI warning. Local CI simulation: POST /api/projects/:id/ci/simulate.",
      changeType: "FEATURE",
      urgency: PriorityLevel.P0,
      status: "VERIFIED",
      branch: "feature/auth-expiry",
      repository: "demo/payments-api",
      commitSha: "expiry-fix-9f2",
      submittedAt: new Date(Date.now() - 5 * 86400000),
      approvedAt: new Date(Date.now() - 4 * 86400000),
      impactedTestIds: retestTestIds,
    },
  });

  const ciRunInitial = await prisma.ciRun.create({
    data: {
      projectId: project.id,
      developerChangeId: payChange.id,
      buildId: build.id,
      provider: "DEMO_SEED",
      repository: "demo/payments-api",
      externalRunId: "demo-ci-run-2401",
      workflowName: "ci.yml",
      branch: "feature/auth-expiry",
      commitSha: "expiry-feature-7d1",
      status: "COMPLETED",
      conclusion: "SUCCESS",
      metadata: { demoSeed: true, label: "Initial feature CI (not a GitHub webhook)" },
      startedAt: new Date(Date.now() - 3 * 86400000),
      completedAt: new Date(Date.now() - 3 * 86400000 + 600000),
    },
  });

  const ciRunFix = await prisma.ciRun.create({
    data: {
      projectId: project.id,
      developerChangeId: payChange.id,
      buildId: buildFix.id,
      provider: "DEMO_SEED",
      repository: "demo/payments-api",
      externalRunId: "demo-ci-run-2402",
      workflowName: "ci.yml",
      branch: "fix/auth-expiry-warning",
      commitSha: "expiry-fix-9f2",
      status: "COMPLETED",
      conclusion: "SUCCESS",
      metadata: { demoSeed: true, label: "Fix verification CI (not a GitHub webhook)" },
      startedAt: new Date(Date.now() - 86400000),
      completedAt: new Date(Date.now() - 86400000 + 420000),
    },
  });

  const retestScope = await prisma.retestScope.create({
    data: {
      projectId: project.id,
      developerChangeId: payChange.id,
      buildId: build.id,
      version: 1,
      status: "APPROVED",
      description: "[DEMO] Ten regression tests for authorization expiry",
      testCaseIds: retestTestIds,
      proposedByUserId: devA.id,
      approvedByUserId: qaLead.id,
      approvedAt: new Date(Date.now() - 2 * 86400000),
    },
  });

  const handoff = await prisma.qAHandoff.create({
    data: {
      projectId: project.id,
      developerChangeId: payChange.id,
      buildId: build.id,
      ciRunId: ciRunInitial.id,
      retestScopeId: retestScope.id,
      createdByUserId: qaLead.id,
      assignedToUserId: qaC.id,
      status: "COMPLETED",
      summary: "[DEMO] Retest authorization expiry on build-2401",
      acceptedAt: new Date(Date.now() - 2 * 86400000 + 3600000),
      completedAt: new Date(Date.now() - 86400000),
    },
  });

  const failedCase = payTestCases.find((t) => t.externalId === "TC-PAY-03")!;
  const cycleCaseFailed = await prisma.testCycleCase.findFirstOrThrow({
    where: { testCycleId: cycle.id, testCaseId: failedCase.id },
  });

  const failExecution = await prisma.testExecution.create({
    data: {
      testCycleCaseId: cycleCaseFailed.id,
      buildId: build.id,
      retestScopeId: retestScope.id,
      qaHandoffId: handoff.id,
      executedByUserId: qaC.id,
      status: "FAILED",
      actualResults: "Warning banner missing 60s before expiry",
      notes: "[DEMO] Failed execution preserved on build-2401",
      startedAt: new Date(Date.now() - 36 * 3600000),
      completedAt: new Date(Date.now() - 35 * 3600000),
    },
  });

  for (const tc of payTestCases.filter((t) => t.externalId !== "TC-PAY-03")) {
    const cc = await prisma.testCycleCase.findFirstOrThrow({
      where: { testCycleId: cycle.id, testCaseId: tc.id },
    });
    await prisma.testExecution.create({
      data: {
        testCycleCaseId: cc.id,
        buildId: build.id,
        retestScopeId: retestScope.id,
        qaHandoffId: handoff.id,
        executedByUserId: qaC.id,
        status: "PASSED",
        notes: "[DEMO] Passed on build-2401",
        startedAt: new Date(Date.now() - 40 * 3600000),
        completedAt: new Date(Date.now() - 39 * 3600000),
      },
    });
  }

  for (const tc of payTestCases) {
    const cc = await prisma.testCycleCase.findFirstOrThrow({
      where: { testCycleId: cycle.id, testCaseId: tc.id },
    });
    await prisma.testExecution.create({
      data: {
        testCycleCaseId: cc.id,
        buildId: buildFix.id,
        retestScopeId: retestScope.id,
        executedByUserId: qaC.id,
        status: "PASSED",
        notes: "[DEMO] Retest passed on build-2402-fix",
        startedAt: new Date(Date.now() - 12 * 3600000),
        completedAt: new Date(Date.now() - 11 * 3600000),
      },
    });
  }

  await prisma.defect.create({
    data: {
      projectId: project.id,
      externalId: "DEF-DEMO-0001",
      summary: "[DEMO] Expiry warning banner not shown",
      description: "Linked to failed execution on build-2401; fixed in build-2402-fix",
      severity: "HIGH",
      priority: PriorityLevel.P1,
      testCaseId: failedCase.id,
      buildId: build.id,
      executionId: failExecution.id,
      reporterUserId: qaC.id,
      assigneeUserId: devA.id,
      status: "VERIFIED",
      expectedBehavior: authExpDecision.expectedBehavior,
      actualBehavior: "No warning before expiry",
    },
  });

  await prisma.gitHubProjectIntegration.create({
    data: {
      projectId: project.id,
      owner: "demo",
      repo: "payments-api",
      webhookSecret: "demo-webhook-secret-change-me",
      defaultBranch: "main",
    },
  });

  await prisma.deliveryTimelineEvent.createMany({
    data: [
      { projectId: project.id, changeId: payChange.id, actorUserId: devA.id, kind: "change.submitted", title: "[DEMO] Change submitted" },
      { projectId: project.id, changeId: payChange.id, actorUserId: qaLead.id, kind: "change.approved", title: "[DEMO] Change approved" },
      { projectId: project.id, changeId: payChange.id, kind: "ci.updated", title: "[DEMO] CI completed (DEMO_SEED)", entityType: "CiRun", entityId: ciRunInitial.id },
      { projectId: project.id, changeId: payChange.id, actorUserId: qaLead.id, kind: "retest_scope.approved", title: "[DEMO] Ten tests approved", entityType: "RetestScope", entityId: retestScope.id },
      { projectId: project.id, changeId: payChange.id, actorUserId: qaLead.id, kind: "handoff.created", title: "[DEMO] QA handoff completed", entityType: "QAHandoff", entityId: handoff.id },
      { projectId: project.id, changeId: payChange.id, actorUserId: qaC.id, kind: "execution.failed", title: "[DEMO] TC-PAY-03 failed", entityType: "TestExecution", entityId: failExecution.id },
      { projectId: project.id, changeId: payChange.id, kind: "ci.updated", title: "[DEMO] Fix build CI success", entityType: "CiRun", entityId: ciRunFix.id },
      { projectId: project.id, changeId: payChange.id, actorUserId: qaC.id, kind: "change.verified", title: "[DEMO] Verification complete" },
    ],
  });

  await prisma.defect.create({
    data: {
      projectId: project.id,
      externalId: "DEF-0001",
      summary: "Restricted user sees admin nav link",
      description: "Navigation still renders admin link before redirect",
      severity: "MEDIUM",
      priority: PriorityLevel.P2,
      testCaseId: testCases.find((t) => t.externalId === "TC-105")!.id,
      buildId: build.id,
      reporterUserId: qaC.id,
      assigneeUserId: devA.id,
      status: "IN_PROGRESS",
    },
  });

  const ecom = await prisma.project.create({
    data: {
      key: "ECOM",
      name: "E-commerce Platform",
      description: "Checkout, catalog, and fulfillment QA workspace",
      members: {
        create: [
          { userId: admin.id, role: ProjectRole.ADMINISTRATOR },
          { userId: qaLead.id, role: ProjectRole.QA_LEAD },
          { userId: qaB.id, role: ProjectRole.QA_LEAD },
          { userId: qaC.id, role: ProjectRole.QA_ENGINEER },
          { userId: devA.id, role: ProjectRole.DEVELOPER },
        ],
      },
      priorityRules: { create: { weights: { businessCriticality: 10, moduleChange: 18, untested: 16 } } },
    },
  });

  const ecomRelease = await prisma.release.create({
    data: {
      projectId: ecom.id,
      name: "Holiday Release",
      version: "1.8.0",
      status: "ACTIVE",
    },
  });

  await prisma.build.create({
    data: { releaseId: ecomRelease.id, label: "ecom-build-180", gitRef: "main@ecom1", isCurrent: true },
  });

  const idp = await prisma.project.create({
    data: {
      key: "IDP",
      name: "Internal Developer Platform",
      description: "CI/CD, developer portals, and internal APIs",
      members: {
        create: [
          { userId: admin.id, role: ProjectRole.ADMINISTRATOR },
          { userId: qaLead.id, role: ProjectRole.QA_ENGINEER },
          { userId: qaB.id, role: ProjectRole.QA_ENGINEER },
          { userId: devA.id, role: ProjectRole.DEVELOPER },
          { userId: viewer.id, role: ProjectRole.VIEWER },
        ],
      },
      priorityRules: { create: { weights: { businessCriticality: 8, moduleChange: 15, untested: 12 } } },
    },
  });

  await prisma.testCase.create({
    data: {
      projectId: ecom.id,
      externalId: "ECOM-001",
      title: "Guest checkout completes with valid card",
      priority: PriorityLevel.P0,
      businessCriticality: 5,
      steps: [{ step: 1, action: "Checkout as guest", expected: "Order confirmation" }],
      expectedResults: "Order placed",
    },
  });

  await prisma.testCase.create({
    data: {
      projectId: idp.id,
      externalId: "IDP-010",
      title: "Pipeline publishes artifact to registry",
      priority: PriorityLevel.P1,
      businessCriticality: 4,
      steps: [{ step: 1, action: "Run pipeline", expected: "Artifact available" }],
      expectedResults: "Artifact versioned",
    },
  });

  console.log("Seed complete.");
  console.log("Demo logins (password: password123):");
  console.log(
    "  admin@agentqa.demo, lead@agentqa.demo, qa.b@agentqa.demo (QA on PAY, Lead on ECOM), qa.c@agentqa.demo, qa.d@agentqa.demo, dev.a@agentqa.demo, viewer@agentqa.demo",
  );
  console.log(`Projects: PAY (${project.key}), ${ecom.key}, ${idp.key}`);
  console.log(`Design decisions seeded: ${decision.externalId}, ${authExpDecision.externalId}`);
  console.log("Delivery demo change: [DEMO] Payment Authorization Expiry (provider DEMO_SEED — not GitHub)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
