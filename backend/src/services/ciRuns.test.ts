import { describe, expect, it } from "vitest";
import { mapGitHubWorkflowStatus, ciBlocksQa } from "./ciRuns.js";

describe("mapGitHubWorkflowStatus", () => {
  it("maps queued, running, and completed states", () => {
    expect(mapGitHubWorkflowStatus("queued", null)).toEqual({ status: "QUEUED", conclusion: null });
    expect(mapGitHubWorkflowStatus("in_progress", null)).toEqual({
      status: "IN_PROGRESS",
      conclusion: null,
    });
    expect(mapGitHubWorkflowStatus("completed", "success")).toEqual({
      status: "COMPLETED",
      conclusion: "SUCCESS",
    });
    expect(mapGitHubWorkflowStatus("completed", "failure")).toEqual({
      status: "COMPLETED",
      conclusion: "FAILURE",
    });
  });
});

describe("ciBlocksQa", () => {
  it("blocks in progress and failure", () => {
    expect(ciBlocksQa({ status: "IN_PROGRESS", conclusion: null })).toBe(true);
    expect(ciBlocksQa({ status: "COMPLETED", conclusion: "FAILURE" })).toBe(true);
  });

  it("allows success", () => {
    expect(ciBlocksQa({ status: "COMPLETED", conclusion: "SUCCESS" })).toBe(false);
  });
});
