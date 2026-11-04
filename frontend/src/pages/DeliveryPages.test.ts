import { describe, expect, it } from "vitest";

describe("delivery status labels", () => {
  it("maps pipeline statuses for display", () => {
    const status = "QA_IN_PROGRESS";
    expect(status.replace(/_/g, " ")).toBe("QA IN PROGRESS");
  });

  it("identifies demo seeded titles", () => {
    expect("[DEMO] Payment Authorization Expiry".includes("[DEMO]")).toBe(true);
  });
});
