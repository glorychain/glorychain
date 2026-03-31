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

  it("calling twice with the same forkChainId produces two entries (no deduplication)", () => {
    const { chain } = makeChainWithBlocks();
    const once = recordForkOnSource(chain, "fork-id", 1, "abc");
    const twice = recordForkOnSource(once, "fork-id", 1, "abc");
    expect(twice.metadata.knownForks.length).toBe(2);
  });

  it("createdAt on appended ForkReference is a valid ISO8601 string", () => {
    const { chain } = makeChainWithBlocks();
    const updated = recordForkOnSource(chain, "fork-chain-id", 1, "abc123");
    const ref = updated.metadata.knownForks[0];
    if (!ref) throw new Error("knownForks[0] is undefined");
    expect(Number.isNaN(new Date(ref.createdAt).getTime())).toBe(false);
    expect(new Date(ref.createdAt).toISOString()).toBe(ref.createdAt);
  });

  it("returned chain retains all original metadata fields unchanged except knownForks", () => {
    const { chain } = makeChainWithBlocks();
    const updated = recordForkOnSource(chain, "fork-chain-id", 1, "abc123");
    expect(updated.metadata.chainId).toBe(chain.metadata.chainId);
    expect(updated.metadata.createdAt).toBe(chain.metadata.createdAt);
    expect(updated.metadata.protocolVersion).toBe(chain.metadata.protocolVersion);
    expect(updated.metadata.hashAlgorithm).toBe(chain.metadata.hashAlgorithm);
    expect(updated.metadata.signatureScheme).toBe(chain.metadata.signatureScheme);
    expect(updated.metadata.migrationHistory).toBe(chain.metadata.migrationHistory);
  });

  it("calling with forkFromBlock beyond chain length still records without throwing", () => {
    const { chain } = makeChainWithBlocks();
    const updated = recordForkOnSource(chain, "fork-chain-id", 9999, "abc123");
    expect(updated.metadata.knownForks.length).toBe(1);
    expect(updated.metadata.knownForks[0]?.forkFromBlock).toBe(9999);
  });
});

describe("forkChain — multi-level fork", () => {
  it("C forks B which forks A: C's fork genesis forkOf === B.metadata.chainId", () => {
    const kp = generateKeypair();
    if (!kp.ok) throw new Error("keygen failed");
    const aResult = createChain(
      {
        content: "A",
        purpose: "A",
        creatorId: "u1",
        identityType: "anonymous",
        publicKey: kp.value.publicKey,
      },
      kp.value.privateKey,
    );
    if (!aResult.ok) throw new Error("A chain failed");
    const bResult = forkChain(
      aResult.value,
      0,
      {
        content: "B",
        purpose: "B",
        creatorId: "u2",
        identityType: "anonymous",
        publicKey: kp.value.publicKey,
      },
      kp.value.privateKey,
    );
    if (!bResult.ok) throw new Error("B fork failed");
    const chainB = bResult.value;
    const cResult = forkChain(
      chainB,
      chainB.blocks.length - 1,
      {
        content: "C",
        purpose: "C",
        creatorId: "u3",
        identityType: "anonymous",
        publicKey: kp.value.publicKey,
      },
      kp.value.privateKey,
    );
    if (!cResult.ok) throw new Error("C fork failed");
    const chainC = cResult.value;
    // First non-provenance block is C's fork genesis
    const cForkGenesis = chainC.blocks.find((b) => !b.provenance) as ForkGenesisBlock | undefined;
    expect(cForkGenesis?.forkOf).toBe(chainB.metadata.chainId);
  });

  it("C's provenance block count equals B's fork point + 1", () => {
    const kp = generateKeypair();
    if (!kp.ok) throw new Error("keygen failed");
    const aResult = createChain(
      {
        content: "A",
        purpose: "A",
        creatorId: "u1",
        identityType: "anonymous",
        publicKey: kp.value.publicKey,
      },
      kp.value.privateKey,
    );
    if (!aResult.ok) throw new Error("A chain failed");
    const bResult = forkChain(
      aResult.value,
      0,
      {
        content: "B",
        purpose: "B",
        creatorId: "u2",
        identityType: "anonymous",
        publicKey: kp.value.publicKey,
      },
      kp.value.privateKey,
    );
    if (!bResult.ok) throw new Error("B fork failed");
    const chainB = bResult.value;
    const bForkPoint = chainB.blocks.length - 1;
    const cResult = forkChain(
      chainB,
      bForkPoint,
      {
        content: "C",
        purpose: "C",
        creatorId: "u3",
        identityType: "anonymous",
        publicKey: kp.value.publicKey,
      },
      kp.value.privateKey,
    );
    if (!cResult.ok) throw new Error("C fork failed");
    const provenanceCount = cResult.value.blocks.filter((b) => b.provenance === true).length;
    expect(provenanceCount).toBe(bForkPoint + 1);
  });
});

describe("forkChain — fork at block 0", () => {
  it("produces exactly 2 blocks (1 provenance + 1 fork genesis)", () => {
    const kp = generateKeypair();
    if (!kp.ok) throw new Error("keygen failed");
    const source = createChain(
      {
        content: "genesis",
        purpose: "test",
        creatorId: "u1",
        identityType: "anonymous",
        publicKey: kp.value.publicKey,
      },
      kp.value.privateKey,
    );
    if (!source.ok) throw new Error("createChain failed");
    const result = forkChain(
      source.value,
      0,
      {
        content: "fork genesis",
        purpose: "fork",
        creatorId: "u2",
        identityType: "anonymous",
        publicKey: kp.value.publicKey,
      },
      kp.value.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.blocks.length).toBe(2);
  });

  it("provenance block at index 0 has provenance: true and hash matches source genesis", () => {
    const kp = generateKeypair();
    if (!kp.ok) throw new Error("keygen failed");
    const source = createChain(
      {
        content: "genesis",
        purpose: "test",
        creatorId: "u1",
        identityType: "anonymous",
        publicKey: kp.value.publicKey,
      },
      kp.value.privateKey,
    );
    if (!source.ok) throw new Error("createChain failed");
    const result = forkChain(
      source.value,
      0,
      {
        content: "fork genesis",
        purpose: "fork",
        creatorId: "u2",
        identityType: "anonymous",
        publicKey: kp.value.publicKey,
      },
      kp.value.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.blocks[0]?.provenance).toBe(true);
    expect(result.value.blocks[0]?.hash).toBe(source.value.blocks[0]?.hash);
  });

  it("fork genesis at index 1 has forkFromBlock === 0", () => {
    const kp = generateKeypair();
    if (!kp.ok) throw new Error("keygen failed");
    const source = createChain(
      {
        content: "genesis",
        purpose: "test",
        creatorId: "u1",
        identityType: "anonymous",
        publicKey: kp.value.publicKey,
      },
      kp.value.privateKey,
    );
    if (!source.ok) throw new Error("createChain failed");
    const result = forkChain(
      source.value,
      0,
      {
        content: "fork genesis",
        purpose: "fork",
        creatorId: "u2",
        identityType: "anonymous",
        publicKey: kp.value.publicKey,
      },
      kp.value.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const forkGenesis = result.value.blocks[1] as unknown as ForkGenesisBlock;
    expect(forkGenesis.forkFromBlock).toBe(0);
  });
});

describe("forkChain — forkSourceBlockHash", () => {
  it(// TODO: implement assertion when verify() checks fork genesis forkSourceBlockHash integrity.
  // The field is included in genesisCanonical() and signed — tampering invalidates the signature.
  // See: packages/core/src/chain/verify.ts (deferred to Phase 3)
  "TODO: verifier detects tampered forkSourceBlockHash — signature-covered field", () => {});
});
