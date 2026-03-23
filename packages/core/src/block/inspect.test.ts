import { describe, expect, it } from "vitest";
import { appendBlock, createChain } from "../chain/index.js";
import { generateKeypair } from "../crypto/keygen.js";
import type { Block } from "../schema/block.js";
import { computeBlockHash, inspectBlock, isGenesisBlock } from "./inspect.js";

function makeChainWithBlock() {
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
  const r1 = appendBlock(
    chain.value,
    { content: "block 1", publicKey: kp.value.publicKey },
    kp.value.privateKey,
  );
  if (!r1.ok) throw new Error("appendBlock failed");
  return r1.value;
}

describe("isGenesisBlock", () => {
  it("returns true for genesis block", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    expect(isGenesisBlock(genesis)).toBe(true);
  });

  it("returns false for non-genesis block", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    expect(isGenesisBlock(block)).toBe(false);
  });
});

describe("inspectBlock", () => {
  it("returns type: genesis for genesis block", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    expect(inspectBlock(genesis).type).toBe("genesis");
  });

  it("returns type: block for non-genesis block", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    expect(inspectBlock(block).type).toBe("block");
  });

  it("inspection.block is the same object reference", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    expect(inspectBlock(genesis).block).toBe(genesis);
  });
});

describe("computeBlockHash", () => {
  it("recomputes hash matching stored hash for genesis block", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    const result = computeBlockHash(genesis, genesis.hashAlgorithm);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(genesis.hash);
    }
  });

  it("recomputes hash matching stored hash for standard block", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    const result = computeBlockHash(block, chain.metadata.hashAlgorithm);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(block.hash);
    }
  });

  it("returns ALGORITHM_UNSUPPORTED for unknown algorithm", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    const result = computeBlockHash(genesis, "blake3");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALGORITHM_UNSUPPORTED");
    }
  });
});
