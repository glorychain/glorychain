import { describe, expect, it } from "vitest";
import { appendBlock, createChain } from "../chain/index.js";
import { generateKeypair } from "../crypto/keygen.js";
import type { KeyResolver } from "../verify/verifyChain.js";
import { verifyChain } from "../verify/verifyChain.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeKp() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  return kp.value;
}

function makeChainWithBlocks(n: number, publicKey: string, privateKey: string) {
  let chain = createChain(
    {
      content: "genesis",
      purpose: "key-resolver-test",
      creatorId: "user1",
      identityType: "anonymous",
      publicKey,
    },
    privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  for (let i = 1; i < n; i++) {
    const r = appendBlock(chain.value, { content: `block ${i}`, publicKey }, privateKey);
    if (!r.ok) throw new Error("appendBlock failed");
    chain = r;
  }
  return chain.value;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("verifyChain with keyResolver", () => {
  it("static keyResolver returns same result as using block.publicKey directly", async () => {
    const kp = makeKp();
    const chain = makeChainWithBlocks(3, kp.publicKey, kp.privateKey);

    const resolver: KeyResolver = (_i, hint) => hint ?? kp.publicKey;
    const result = await verifyChain(chain, { keyResolver: resolver });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.blockCount).toBe(3);
  });

  it("rotation fixture: 3 key pairs, 30 blocks (10 per key), resolver returns correct key", async () => {
    const kp1 = makeKp();
    const kp2 = makeKp();
    const kp3 = makeKp();

    // Build chain: blocks 0-9 with kp1, 10-19 with kp2, 20-29 with kp3
    let chain = createChain(
      {
        content: "genesis",
        purpose: "rotation-test",
        creatorId: "user1",
        identityType: "anonymous",
        publicKey: kp1.publicKey,
      },
      kp1.privateKey,
    );
    if (!chain.ok) throw new Error("createChain failed");

    for (let i = 1; i < 30; i++) {
      const kp = i < 10 ? kp1 : i < 20 ? kp2 : kp3;
      const r = appendBlock(
        chain.value,
        { content: `block ${i}`, publicKey: kp.publicKey },
        kp.privateKey,
      );
      if (!r.ok) throw new Error(`appendBlock failed at ${i}: ${r.error.message}`);
      chain = r;
    }

    const resolver: KeyResolver = (blockIndex) => {
      if (blockIndex < 10) return kp1.publicKey;
      if (blockIndex < 20) return kp2.publicKey;
      return kp3.publicKey;
    };

    const result = await verifyChain(chain.value, { keyResolver: resolver });
    expect(result.valid).toBe(true);
    expect(result.blockCount).toBe(30);
  });

  it("resolver returns wrong key for a block → INVALID_SIGNATURE at that block", async () => {
    const kp1 = makeKp();
    const kp2 = makeKp();
    // Build 20-block chain all signed with kp1
    const chain = makeChainWithBlocks(20, kp1.publicKey, kp1.privateKey);

    // Return wrong key (kp2) for block index 15
    const resolver: KeyResolver = (blockIndex) => {
      if (blockIndex === 15) return kp2.publicKey;
      return kp1.publicKey;
    };

    const result = await verifyChain(chain, { keyResolver: resolver });
    expect(result.valid).toBe(false);
    const sigErrors = result.errors.filter((e) => e.code === "INVALID_SIGNATURE");
    expect(sigErrors.length).toBeGreaterThan(0);
    expect(sigErrors.some((e) => e.blockNumber === 15)).toBe(true);
  });

  it("async resolver (returns Promise) is awaited correctly and chain passes", async () => {
    const kp = makeKp();
    const chain = makeChainWithBlocks(5, kp.publicKey, kp.privateKey);

    const asyncResolver: KeyResolver = async (_i, hint) => {
      // Simulate async lookup
      await new Promise((r) => setTimeout(r, 1));
      return hint ?? kp.publicKey;
    };

    const result = await verifyChain(chain, { keyResolver: asyncResolver });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("keyResolver that throws adds MISSING_KEY error for affected block", async () => {
    const kp = makeKp();
    const chain = makeChainWithBlocks(5, kp.publicKey, kp.privateKey);

    const throwingResolver: KeyResolver = (blockIndex) => {
      if (blockIndex === 2) throw new Error("key not found");
      return kp.publicKey;
    };

    const result = await verifyChain(chain, { keyResolver: throwingResolver });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "MISSING_KEY" && e.blockNumber === 2)).toBe(true);
  });

  it("existing verifyChain call sites (no keyResolver) still work synchronously", () => {
    const kp = makeKp();
    const chain = makeChainWithBlocks(3, kp.publicKey, kp.privateKey);
    // This should return VerificationResult synchronously (not a Promise)
    const result = verifyChain(chain);
    expect(result.valid).toBe(true);
    expect(result.blockCount).toBe(3);
    // Confirm it's not a Promise
    expect(typeof (result as unknown as Promise<unknown>).then).toBe("undefined");
  });

  it("options.publicKey overrides block.publicKey for all blocks in sync path", () => {
    const kp = makeKp();
    const kp2 = makeKp();
    const chain = makeChainWithBlocks(3, kp.publicKey, kp.privateKey);

    // Wrong key → signature failures
    const result = verifyChain(chain, { publicKey: kp2.publicKey });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_SIGNATURE")).toBe(true);
  });

  it("options.publicKey matching signer passes all blocks", () => {
    const kp = makeKp();
    const chain = makeChainWithBlocks(3, kp.publicKey, kp.privateKey);

    const result = verifyChain(chain, { publicKey: kp.publicKey });
    expect(result.valid).toBe(true);
  });
});
