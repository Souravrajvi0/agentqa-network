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

  const payChange = await prisma.developerChangeRequest.create({
    data: {
      projectId: project.id,
      releaseId: release.id,
      buildId: build.id,
      featureId: permFeature.id,
      authorUserId: devA.id,
      title: "Permission validation updated",
      description:
        "We updated permission validation. Restricted-user access and administrative overrides must be retested.",
      urgency: PriorityLevel.P0,
      status: "QA_PENDING",
      branch: "feature/perm-validation",
      repository: "demo/payments-api",
      commitSha: build.gitRef ?? "main@abc123",
      submittedAt: new Date(Date.now() - 86400000),
      approvedAt: new Date(Date.now() - 43200000),
      impactedTestIds: [
        testCases.find((t) => t.externalId === "TC-105")!.id,
        testCases.find((t) => t.externalId === "TC-110")!.id,
      ],
    },
  });

  const ciRun = await prisma.ciRun.create({
    data: {
      projectId: project.id,
      developerChangeId: payChange.id,
      buildId: build.id,
      repository: "demo/payments-api",
      externalRunId: "seed-run-1001",
      workflowName: "ci.yml",
      workflowUrl: "https://github.com/demo/payments-api/actions/runs/1001",
      branch: "feature/perm-validation",
      commitSha: build.gitRef ?? "main@abc123",
      status: "COMPLETED",
      conclusion: "SUCCESS",
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 3000000),
    },
  });

  const retestScope = await prisma.retestScope.create({
    data: {
      projectId: project.id,
      developerChangeId: payChange.id,
      buildId: build.id,
      version: 1,
      status: "APPROVED",
      description: "Permission and admin override regression",
      testCaseIds: payChange.impactedTestIds,
      proposedByUserId: devA.id,
      approvedByUserId: qaLead.id,
      approvedAt: new Date(Date.now() - 1800000),
    },
  });

  await prisma.qAHandoff.create({
    data: {
      projectId: project.id,
      developerChangeId: payChange.id,
      buildId: build.id,
      ciRunId: ciRun.id,
      retestScopeId: retestScope.id,
      createdByUserId: qaLead.id,
      status: "PENDING",
      summary: "Retest permission validation on current build",
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
      {
        projectId: project.id,
        changeId: payChange.id,
        actorUserId: devA.id,
        kind: "change.submitted",
        title: "Change submitted",
      },
      {
        projectId: project.id,
        changeId: payChange.id,
        actorUserId: qaLead.id,
        kind: "change.approved",
        title: "Change approved for CI",
      },
      {
        projectId: project.id,
        changeId: payChange.id,
        actorType: "HUMAN",
        kind: "ci.updated",
        title: "CI ci.yml: COMPLETED (SUCCESS)",
        entityType: "CiRun",
        entityId: ciRun.id,
      },
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
  console.log(`Design decision seeded: ${decision.externalId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
