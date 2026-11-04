import crypto from "crypto";
import { describe, expect, it } from "vitest";

function verifyGitHubSignature(secret: string, rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = signatureHeader.slice("sha256=".length);
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(expected));
  } catch {
    return false;
  }
}

describe("GitHub webhook signature", () => {
  const secret = "test-secret";
  const body = Buffer.from(JSON.stringify({ ok: true }));

  it("accepts valid signature", () => {
    const digest = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyGitHubSignature(secret, body, `sha256=${digest}`)).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(verifyGitHubSignature(secret, body, "sha256=deadbeef")).toBe(false);
  });

  it("rejects missing signature", () => {
    expect(verifyGitHubSignature(secret, body, undefined)).toBe(false);
  });
});
