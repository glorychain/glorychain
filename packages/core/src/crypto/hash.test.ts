import { describe, expect, it } from "vitest";
import { hashBlock } from "./hash.js";

describe("hashBlock", () => {
  it("returns lowercase hex SHA-256 for known input", () => {
    const result = hashBlock("hello");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    }
  });

  it("returns 64-char hex for SHA-256", () => {
    const result = hashBlock("glorychain-block-payload");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(64);
      expect(result.value).toMatch(/^[0-9a-f]+$/);
    }
  });

  it("is deterministic — same input always produces same output", () => {
    const a = hashBlock("determinism-test");
    const b = hashBlock("determinism-test");
    expect(a).toEqual(b);
  });

  it("returns ALGORITHM_UNSUPPORTED for unknown algorithm", () => {
    const result = hashBlock("payload", "blake3");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALGORITHM_UNSUPPORTED");
    }
  });

  it("accepts sha256 case-insensitively", () => {
    const lower = hashBlock("test", "sha256");
    const upper = hashBlock("test", "SHA256");
    expect(lower.ok).toBe(true);
    expect(upper.ok).toBe(true);
    if (lower.ok && upper.ok) {
      expect(lower.value).toBe(upper.value);
    }
  });
});
