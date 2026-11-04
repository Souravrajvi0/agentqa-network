import { describe, expect, it } from "vitest";
import { mapGitHubWorkflowStatus, ciBlocksQa } from "./ciRuns.js";

describe("mapGitHubWorkflowStatus", () => {
  it("maps queued and in_progress", () => {
    expect(mapGitHubWorkflowStatus("queued", null)).toEqual({ status: "QUEUED", conclusion: null });
    expect(mapGitHubWorkflowStatus("in_progress", null)).toEqual({
      status: "IN_PROGRESS",
      conclusion: null,
    });
  });

  it("maps completed conclusions", () => {
    expect(mapGitHubWorkflowStatus("completed", "success")).toEqual({
      status: "COMPLETED",
      conclusion: "SUCCESS",
    });
    expect(mapGitHubWorkflowStatus("completed", "failure")).toEqual({
      status: "COMPLETED",
      conclusion: "FAILURE",
    });
    expect(mapGitHubWorkflowStatus("completed", "timed_out")).toEqual({
      status: "COMPLETED",
      conclusion: "TIMED_OUT",
    });
  });

  it("maps unknown conclusions to NEUTRAL", () => {
    expect(mapGitHubWorkflowStatus("completed", "something_new")).toEqual({
      status: "COMPLETED",
      conclusion: "NEUTRAL",
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
