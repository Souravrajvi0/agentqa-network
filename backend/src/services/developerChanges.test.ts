import { describe, expect, it } from "vitest";
import { assertChangeTransition } from "./developerChanges.js";
import { ConflictError } from "../lib/errors.js";

describe("developer change transitions", () => {
  it("allows draft to submitted", () => {
    expect(() => assertChangeTransition("DRAFT", "SUBMITTED")).not.toThrow();
  });

  it("blocks draft to approved", () => {
    expect(() => assertChangeTransition("DRAFT", "APPROVED")).toThrow(ConflictError);
  });

  it("allows submitted to approved or rejected", () => {
    expect(() => assertChangeTransition("SUBMITTED", "APPROVED")).not.toThrow();
    expect(() => assertChangeTransition("SUBMITTED", "REJECTED")).not.toThrow();
  });

  it("allows approved to completed", () => {
    expect(() => assertChangeTransition("APPROVED", "COMPLETED")).not.toThrow();
  });
});
