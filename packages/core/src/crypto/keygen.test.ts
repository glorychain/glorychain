import { describe, expect, it } from "vitest";
import { CUSTODY_WARNING, generateKeypair } from "./keygen.js";

describe("generateKeypair", () => {
  it("generates a keypair with Base64url-encoded strings", () => {
    const result = generateKeypair();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.publicKey).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.value.privateKey).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique keypairs on each call", () => {
    const a = generateKeypair();
    const b = generateKeypair();
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.publicKey).not.toBe(b.value.publicKey);
    expect(a.value.privateKey).not.toBe(b.value.privateKey);
  });

  it("public key is SPKI-DER format (44 bytes)", () => {
    const result = generateKeypair();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pub = Buffer.from(result.value.publicKey, "base64url");
    expect(pub.length).toBe(44);
  });

  it("private key is PKCS8-DER format (48 bytes)", () => {
    const result = generateKeypair();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const priv = Buffer.from(result.value.privateKey, "base64url");
    expect(priv.length).toBe(48);
  });

  it("returns ALGORITHM_UNSUPPORTED for unknown scheme", () => {
    const result = generateKeypair("rsa");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALGORITHM_UNSUPPORTED");
    }
  });
});

describe("CUSTODY_WARNING", () => {
  it("is a non-empty string", () => {
    expect(typeof CUSTODY_WARNING).toBe("string");
    expect(CUSTODY_WARNING.length).toBeGreaterThan(0);
  });

  it("contains key safety language", () => {
    expect(CUSTODY_WARNING.toLowerCase()).toContain("private key");
  });
});
