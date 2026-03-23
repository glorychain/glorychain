import { describe, expect, it } from "vitest";
import { generateKeypair } from "../crypto/keygen.js";
import { createChain } from "./create.js";

function makeKeypair() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  return kp.value;
}

describe("createChain", () => {
  it("creates a chain with genesis block at index 0", () => {
    const kp = makeKeypair();
    const result = createChain(
      {
        content: "hello",
        purpose: "test",
        creatorId: "user1",
        identityType: "anonymous",
        publicKey: kp.publicKey,
      },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.blocks.length).toBe(1);
    expect(result.value.blocks[0]?.blockNumber).toBe(0);
  });

  it("genesis block has null previousHash", () => {
    const kp = makeKeypair();
    const result = createChain(
      {
        content: "hello",
        purpose: "test",
        creatorId: "user1",
        identityType: "anonymous",
        publicKey: kp.publicKey,
      },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.blocks[0]?.previousHash).toBeNull();
  });

  it("chain metadata has matching chainId", () => {
    const kp = makeKeypair();
    const result = createChain(
      {
        content: "hello",
        purpose: "test",
        creatorId: "user1",
        identityType: "anonymous",
        publicKey: kp.publicKey,
      },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const genesis = result.value.blocks[0];
    expect(result.value.metadata.chainId).toBe(genesis?.chainId);
  });

  it("migration/fork/transfer histories are empty", () => {
    const kp = makeKeypair();
    const result = createChain(
      {
        content: "hello",
        purpose: "test",
        creatorId: "user1",
        identityType: "anonymous",
        publicKey: kp.publicKey,
      },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.metadata.migrationHistory).toEqual([]);
    expect(result.value.metadata.knownForks).toEqual([]);
    expect(result.value.metadata.transferHistory).toEqual([]);
  });

  it("genesis block has 64-char hash and non-empty signature", () => {
    const kp = makeKeypair();
    const result = createChain(
      {
        content: "hello",
        purpose: "test",
        creatorId: "user1",
        identityType: "anonymous",
        publicKey: kp.publicKey,
      },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const genesis = result.value.blocks[0];
    expect(genesis?.hash).toHaveLength(64);
    expect(genesis?.signature.length).toBeGreaterThan(0);
  });
});
