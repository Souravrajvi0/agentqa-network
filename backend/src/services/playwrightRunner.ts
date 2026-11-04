import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { config } from "../lib/config.js";
import { prisma } from "../lib/prisma.js";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import { publishProjectEvent } from "../ws/hub.js";

const ALLOWED_COMMANDS = new Map<string, string>([
  ["smoke-login", "npx playwright test tests/smoke-login.spec.ts"],
  ["smoke-dashboard", "npx playwright test tests/smoke-dashboard.spec.ts"],
]);

export async function runAutomatedTest(params: {
  testCaseExternalId: string;
  cycleCaseId: string;
  buildId: string;
  environmentId?: string;
  userId?: string;
  agentId?: string;
}) {
  const cycleCase = await prisma.testCycleCase.findUnique({
    where: { id: params.cycleCaseId },
    include: {
      testCase: true,
      testCycle: true,
      assignment: true,
    },
  });
  if (!cycleCase) throw new NotFoundError("Cycle case not found");
  if (cycleCase.testCase.externalId !== params.testCaseExternalId) {
    throw new ForbiddenError("Test case mismatch");
  }
  if (!cycleCase.testCase.automationAvailable || !cycleCase.testCase.automationCommand) {
    throw new ForbiddenError("Automation not configured for this test case");
  }

  const commandKey = cycleCase.testCase.automationCommand;
  const shellCommand = ALLOWED_COMMANDS.get(commandKey);
  if (!shellCommand) {
    throw new ForbiddenError(`Automation command '${commandKey}' is not approved`);
  }

  const execution = await prisma.testExecution.create({
    data: {
      testCycleCaseId: params.cycleCaseId,
      buildId: params.buildId,
      environmentId: params.environmentId,
      executedByUserId: params.userId,
      executedByAgentId: params.agentId,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  publishProjectEvent(cycleCase.testCycle.projectId, "execution.started", { execution });

  const cwd = config.automationDir;
  const started = Date.now();

  try {
    const { exitCode, stdout, stderr } = await execShell(shellCommand, cwd);
    const passed = exitCode === 0;
    const evidenceDir = path.join(config.uploadsDir, "evidence", execution.id);
    await fs.mkdir(evidenceDir, { recursive: true });
    await fs.writeFile(path.join(evidenceDir, "stdout.log"), stdout);
    await fs.writeFile(path.join(evidenceDir, "stderr.log"), stderr);

    const updated = await prisma.testExecution.update({
      where: { id: execution.id },
      data: {
        status: passed ? "PASSED" : "FAILED",
        completedAt: new Date(),
        durationMs: Date.now() - started,
        notes: passed ? "Automated run passed" : "Automated run failed",
      },
    });

    await prisma.testEvidence.createMany({
      data: [
        {
          executionId: execution.id,
          type: "LOG",
          filePath: path.join(evidenceDir, "stdout.log"),
          content: stdout.slice(0, 8000),
        },
        {
          executionId: execution.id,
          type: "LOG",
          filePath: path.join(evidenceDir, "stderr.log"),
          content: stderr.slice(0, 8000),
        },
      ],
    });

    if (cycleCase.assignment) {
      await prisma.testAssignment.update({
        where: { id: cycleCase.assignment.id },
        data: {
          status: passed ? "COMPLETED" : "IN_PROGRESS",
          completedAt: passed ? new Date() : undefined,
          lockVersion: { increment: 1 },
        },
      });
    }

    publishProjectEvent(cycleCase.testCycle.projectId, "execution.completed", {
      execution: updated,
      passed,
    });

    return { execution: updated, passed, stdout, stderr };
  } catch (err) {
    const updated = await prisma.testExecution.update({
      where: { id: execution.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        durationMs: Date.now() - started,
        notes: err instanceof Error ? err.message : "Run failed",
      },
    });
    publishProjectEvent(cycleCase.testCycle.projectId, "execution.completed", {
      execution: updated,
      passed: false,
    });
    throw err;
  }
}

function execShell(
  command: string,
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("bash", ["-lc", command], { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
  });
}

export async function markExecutionsStaleForBuild(projectId: string, buildId: string, reason: string) {
  const cycleCases = await prisma.testCycleCase.findMany({
    where: { testCycle: { projectId } },
    select: { id: true },
  });
  const ids = cycleCases.map((c) => c.id);
  await prisma.testExecution.updateMany({
    where: {
      testCycleCaseId: { in: ids },
      buildId: { not: buildId },
      status: "PASSED",
      isStale: false,
    },
    data: { isStale: true, staleReason: reason },
  });
}
