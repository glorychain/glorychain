import { describe, expect, it } from "vitest";
import { generateKeypair } from "./keygen.js";
import { signBlock, verifyBlock } from "./sign.js";

describe("signBlock / verifyBlock", () => {
  it("sign + verify round-trip returns true for correct key", () => {
    const kp = generateKeypair();
    expect(kp.ok).toBe(true);
    if (!kp.ok) return;

    const payload = "block-payload-content";
    const signed = signBlock(payload, kp.value.privateKey);
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;

    const verified = verifyBlock(payload, signed.value, kp.value.publicKey);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.value).toBe(true);
    }
  });

  it("returns false (not error) for wrong public key", () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    expect(kp1.ok).toBe(true);
    expect(kp2.ok).toBe(true);
    if (!kp1.ok || !kp2.ok) return;

    const signed = signBlock("payload", kp1.value.privateKey);
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;

    const verified = verifyBlock("payload", signed.value, kp2.value.publicKey);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.value).toBe(false);
    }
  });

  it("returns false for tampered payload", () => {
    const kp = generateKeypair();
    expect(kp.ok).toBe(true);
    if (!kp.ok) return;

    const signed = signBlock("original-payload", kp.value.privateKey);
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;

    const verified = verifyBlock("tampered-payload", signed.value, kp.value.publicKey);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.value).toBe(false);
    }
  });

  it("returns ALGORITHM_UNSUPPORTED for unknown sign scheme", () => {
    const result = signBlock("payload", "fakeprivkey", "rsa-pss");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALGORITHM_UNSUPPORTED");
    }
  });

  it("returns ALGORITHM_UNSUPPORTED for unknown verify scheme", () => {
    const result = verifyBlock("payload", "fakesig", "fakepubkey", "ecdsa");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALGORITHM_UNSUPPORTED");
    }
  });
});
