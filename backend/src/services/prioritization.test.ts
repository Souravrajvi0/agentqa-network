import { describe, expect, it } from "vitest";
import { computePriorityScore } from "./prioritization.js";
import type { TestCase } from "@prisma/client";

const baseCase = {
  id: "1",
  projectId: "p",
  externalId: "TC-105",
  title: "Restricted user blocked",
  description: null,
  preconditions: null,
  steps: [],
  expectedResults: null,
  moduleId: null,
  featureId: null,
  testType: "FUNCTIONAL",
  priority: "P0",
  businessCriticality: 5,
  tags: [],
  automationAvailable: true,
  automationCommand: "smoke-dashboard",
  currentVersion: 1,
  archived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies TestCase;

describe("computePriorityScore", () => {
  it("elevates score when module changed and untested", () => {
    const low = computePriorityScore({
      testCase: baseCase,
      recentModuleChange: false,
      defectCount: 0,
      failureRate: 0,
      requirementChanged: false,
      untestedOnBuild: false,
      releaseUrgency: 1,
    });
    const high = computePriorityScore({
      testCase: baseCase,
      recentModuleChange: true,
      defectCount: 2,
      failureRate: 0.5,
      requirementChanged: true,
      untestedOnBuild: true,
      releaseUrgency: 3,
    });
    expect(high.score).toBeGreaterThan(low.score);
    expect(high.recommended).toBe("P0");
    expect(high.reasons.length).toBeGreaterThan(0);
  });
});
