import { describe, expect, it } from "vitest";
import { generateKeypair } from "../crypto/keygen.js";
import type { Block, ForkGenesisBlock } from "../schema/block.js";
import { appendBlock } from "./append.js";
import { createChain } from "./create.js";
import { forkChain, recordForkOnSource } from "./fork.js";

function makeChainWithBlocks() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain0 = createChain(
    {
      content: "genesis",
      purpose: "test",
      creatorId: "user1",
      identityType: "anonymous",
      publicKey: kp.value.publicKey,
    },
    kp.value.privateKey,
  );
  if (!chain0.ok) throw new Error("createChain failed");
  const r1 = appendBlock(
    chain0.value,
    { content: "b1", publicKey: kp.value.publicKey },
    kp.value.privateKey,
  );
  if (!r1.ok) throw new Error("appendBlock failed");
  return { chain: r1.value, kp: kp.value };
}

describe("forkChain", () => {
  it("creates a new chain with different chainId", () => {
    const { chain, kp } = makeChainWithBlocks();
    const result = forkChain(
      chain,
      1,
      {
        content: "fork genesis",
        purpose: "fork",
        creatorId: "user2",
        identityType: "anonymous",
        publicKey: kp.publicKey,
      },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.metadata.chainId).not.toBe(chain.metadata.chainId);
  });

  it("fork genesis block has correct forkOf and forkFromBlock", () => {
    const { chain, kp } = makeChainWithBlocks();
    // forking at block 1 — provenance blocks: [0, 1], fork genesis at index 2
    const result = forkChain(
      chain,
      1,
      {
        content: "fork genesis",
        purpose: "fork",
        creatorId: "user2",
        identityType: "anonymous",
        publicKey: kp.publicKey,
      },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const forkGenesis = result.value.blocks[2] as unknown as ForkGenesisBlock;
    expect(forkGenesis.forkOf).toBe(chain.metadata.chainId);
    expect(forkGenesis.forkFromBlock).toBe(1);
  });

  it("forkSourceBlockHash matches source block hash", () => {
    const { chain, kp } = makeChainWithBlocks();
    const result = forkChain(
      chain,
      1,
      {
        content: "fork genesis",
        purpose: "fork",
        creatorId: "user2",
        identityType: "anonymous",
        publicKey: kp.publicKey,
      },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const forkGenesis = result.value.blocks[2] as unknown as ForkGenesisBlock;
    expect(forkGenesis.forkSourceBlockHash).toBe(chain.blocks[1]?.hash);
  });

  it("provenance blocks are copied from source chain", () => {
    const { chain, kp } = makeChainWithBlocks();
    const result = forkChain(
      chain,
      1,
      {
        content: "fork genesis",
        purpose: "fork",
        creatorId: "user2",
        identityType: "anonymous",
        publicKey: kp.publicKey,
      },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const fork = result.value;
    // blocks[0] and blocks[1] are provenance copies of source blocks
    expect(fork.blocks[0]?.provenance).toBe(true);
    expect(fork.blocks[1]?.provenance).toBe(true);
    expect(fork.blocks[0]?.hash).toBe(chain.blocks[0]?.hash);
    expect(fork.blocks[1]?.hash).toBe(chain.blocks[1]?.hash);
    // fork genesis is not provenance
    expect(fork.blocks[2]?.provenance).toBeUndefined();
    // total blocks: 2 provenance + 1 fork genesis
    expect(fork.blocks.length).toBe(3);
  });

  it("appended block after fork has correct blockNumber and chainId", () => {
    const { chain, kp } = makeChainWithBlocks();
    const result = forkChain(
      chain,
      1,
      {
        content: "fork genesis",
        purpose: "fork",
        creatorId: "user2",
        identityType: "anonymous",
        publicKey: kp.publicKey,
      },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const appended = appendBlock(
      result.value,
      { content: "post-fork block", publicKey: kp.publicKey },
      kp.privateKey,
    );
    expect(appended.ok).toBe(true);
    if (!appended.ok) return;
    const newBlock = appended.value.blocks[3] as Block;
    expect(newBlock.blockNumber).toBe(3);
    expect(newBlock.chainId).toBe(result.value.metadata.chainId);
    expect(newBlock.provenance).toBeUndefined();
  });

  it("returns CHAIN_NOT_FOUND for out-of-range block number", () => {
    const { chain, kp } = makeChainWithBlocks();
    const result = forkChain(
      chain,
      99,
      {
        content: "fork genesis",
        purpose: "fork",
        creatorId: "user2",
        identityType: "anonymous",
        publicKey: kp.publicKey,
      },
      kp.privateKey,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CHAIN_NOT_FOUND");
    }
  });
});

describe("recordForkOnSource", () => {
  it("appends fork reference to source chain knownForks", () => {
    const { chain } = makeChainWithBlocks();
    const updated = recordForkOnSource(chain, "fork-chain-id", 1, "abc123");
    expect(updated.metadata.knownForks.length).toBe(1);
    expect(updated.metadata.knownForks[0]?.forkChainId).toBe("fork-chain-id");
  });

  it("does not mutate source chain", () => {
    const { chain } = makeChainWithBlocks();
    recordForkOnSource(chain, "fork-chain-id", 1, "abc123");
    expect(chain.metadata.knownForks.length).toBe(0);
  });
});
