import { describe, expect, it } from "vitest";
import { generateKeypair } from "../crypto/keygen.js";
import { appendBlock } from "./append.js";
import { createChain } from "./create.js";

function makeChain() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain = createChain(
    {
      content: "genesis",
      purpose: "test",
      creatorId: "user1",
      identityType: "anonymous",
      publicKey: kp.value.publicKey,
    },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  return { chain: chain.value, kp: kp.value };
}

describe("appendBlock", () => {
  it("appends a block with correct blockNumber", () => {
    const { chain, kp } = makeChain();
    const result = appendBlock(
      chain,
      { content: "block 1", publicKey: kp.publicKey },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.blocks.length).toBe(2);
    expect(result.value.blocks[1]?.blockNumber).toBe(1);
  });

  it("previousHash of new block matches hash of preceding block", () => {
    const { chain, kp } = makeChain();
    const result = appendBlock(
      chain,
      { content: "block 1", publicKey: kp.publicKey },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const genesis = result.value.blocks[0];
    const block1 = result.value.blocks[1];
    expect(block1?.previousHash).toBe(genesis?.hash);
  });

  it("does not mutate original chain", () => {
    const { chain, kp } = makeChain();
    const originalLength = chain.blocks.length;
    appendBlock(chain, { content: "block 1", publicKey: kp.publicKey }, kp.privateKey);
    expect(chain.blocks.length).toBe(originalLength);
  });

  it("can append multiple blocks in sequence", () => {
    const { chain: chain0, kp } = makeChain();
    const r1 = appendBlock(chain0, { content: "b1", publicKey: kp.publicKey }, kp.privateKey);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = appendBlock(r1.value, { content: "b2", publicKey: kp.publicKey }, kp.privateKey);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.value.blocks.length).toBe(3);
    expect(r2.value.blocks[2]?.previousHash).toBe(r2.value.blocks[1]?.hash);
  });
});
