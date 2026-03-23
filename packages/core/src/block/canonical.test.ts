import { describe, expect, it } from "vitest";
import { appendBlock, createChain } from "../chain/index.js";
import { generateKeypair } from "../crypto/keygen.js";
import type { Block } from "../schema/block.js";
import { blockCanonical, genesisCanonical } from "./canonical.js";

function makeChainWithBlock() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain = createChain(
    {
      content: "genesis content",
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
    { content: "block 1 content", publicKey: kp.value.publicKey },
    kp.value.privateKey,
  );
  if (!r1.ok) throw new Error("appendBlock failed");
  return r1.value;
}

describe("genesisCanonical", () => {
  it("returns a string", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    expect(typeof genesisCanonical(genesis)).toBe("string");
  });

  it("is deterministic", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    expect(genesisCanonical(genesis)).toBe(genesisCanonical(genesis));
  });

  it("includes all genesis-specific fields", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    const parsed = JSON.parse(genesisCanonical(genesis)) as Record<string, unknown>;
    expect(parsed.blockNumber).toBe(0);
    expect(parsed.previousHash).toBeNull();
    expect(parsed.creatorId).toBe("user1");
    expect(parsed.purpose).toBe("test");
    expect(parsed.identityType).toBe("anonymous");
  });
});

describe("blockCanonical", () => {
  it("returns a string", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    expect(typeof blockCanonical(block)).toBe("string");
  });

  it("is deterministic", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    expect(blockCanonical(block)).toBe(blockCanonical(block));
  });

  it("includes all standard block fields", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    const parsed = JSON.parse(blockCanonical(block)) as Record<string, unknown>;
    expect(parsed.blockNumber).toBe(1);
    expect(parsed.chainId).toBe(chain.metadata.chainId);
    expect(parsed.content).toBe("block 1 content");
    expect(typeof parsed.timestamp).toBe("string");
    expect(parsed.previousHash).toBe(chain.blocks[0]?.hash);
  });

  it("does not include genesis-specific fields", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    const parsed = JSON.parse(blockCanonical(block)) as Record<string, unknown>;
    expect(parsed.creatorId).toBeUndefined();
    expect(parsed.purpose).toBeUndefined();
  });
});
