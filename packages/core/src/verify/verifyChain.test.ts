import { describe, expect, it } from "vitest";
import { appendBlock, createChain, forkChain } from "../chain/index.js";
import { generateKeypair } from "../crypto/keygen.js";
import type { Block, GenesisBlock } from "../schema/block.js";
import type { Chain } from "../schema/chain.js";
import { createAjvValidator } from "../validate/ajv.js";
import { verifyChain } from "./verifyChain.js";

function makeChainWithBlocks(n = 2) {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  let chain = createChain(
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
  for (let i = 0; i < n - 1; i++) {
    const r = appendBlock(
      chain.value,
      { content: `block ${i + 1}`, publicKey: kp.value.publicKey },
      kp.value.privateKey,
    );
    if (!r.ok) throw new Error("appendBlock failed");
    chain = r;
  }
  return chain.value;
}

describe("verifyChain", () => {
  it("valid 3-block chain passes", () => {
    const chain = makeChainWithBlocks(3);
    const result = verifyChain(chain);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.blockCount).toBe(3);
    expect(result.lastVerifiedBlock).toBe(2);
  });

  it("single genesis chain passes", () => {
    const chain = makeChainWithBlocks(1);
    const result = verifyChain(chain);
    expect(result.valid).toBe(true);
    expect(result.blockCount).toBe(1);
    expect(result.lastVerifiedBlock).toBe(0);
  });

  it("tampered block content causes BROKEN_CHAIN", () => {
    const chain = makeChainWithBlocks(2);
    const tampered: Chain = {
      ...chain,
      blocks: [
        chain.blocks[0] as GenesisBlock,
        { ...(chain.blocks[1] as Block), content: "tampered" },
      ],
    };
    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "BROKEN_CHAIN")).toBe(true);
  });

  it("broken previousHash causes BROKEN_CHAIN", () => {
    const chain = makeChainWithBlocks(2);
    const tampered: Chain = {
      ...chain,
      blocks: [
        chain.blocks[0] as GenesisBlock,
        { ...(chain.blocks[1] as Block), previousHash: "a".repeat(64) },
      ],
    };
    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "BROKEN_CHAIN")).toBe(true);
  });

  it("duplicate block numbers cause DUPLICATE_BLOCK", () => {
    const chain = makeChainWithBlocks(2);
    const tampered: Chain = {
      ...chain,
      blocks: [chain.blocks[0] as GenesisBlock, { ...(chain.blocks[1] as Block), blockNumber: 0 }],
    };
    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "DUPLICATE_BLOCK")).toBe(true);
  });

  it("blockCount equals chain length", () => {
    const chain = makeChainWithBlocks(5);
    const result = verifyChain(chain);
    expect(result.blockCount).toBe(5);
  });

  it("lastVerifiedBlock reflects last clean block even if earlier blocks fail", () => {
    const chain = makeChainWithBlocks(2);
    const tampered: Chain = {
      ...chain,
      blocks: [
        { ...(chain.blocks[0] as GenesisBlock), content: "tampered" },
        chain.blocks[1] as Block,
      ],
    };
    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
    // block 0 fails (tampered), block 1 is structurally clean — lastVerifiedBlock = 1
    expect(result.lastVerifiedBlock).toBe(1);
  });

  describe("fork chain with provenance blocks", () => {
    function makeForkChain() {
      const kp = generateKeypair();
      if (!kp.ok) throw new Error("keygen failed");
      const source = makeChainWithBlocks(3);
      return {
        kp: kp.value,
        source,
        fork: forkChain(
          source,
          2,
          {
            content: "fork genesis",
            purpose: "fork",
            creatorId: "user2",
            identityType: "anonymous",
            publicKey: kp.value.publicKey,
          },
          kp.value.privateKey,
        ),
      };
    }

    it("valid fork chain passes verification", () => {
      const { fork } = makeForkChain();
      expect(fork.ok).toBe(true);
      if (!fork.ok) return;
      const result = verifyChain(fork.value);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("fork chain with appended block passes verification", () => {
      const { fork, kp } = makeForkChain();
      expect(fork.ok).toBe(true);
      if (!fork.ok) return;
      const appended = appendBlock(
        fork.value,
        { content: "post-fork", publicKey: kp.publicKey },
        kp.privateKey,
      );
      expect(appended.ok).toBe(true);
      if (!appended.ok) return;
      const result = verifyChain(appended.value);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("tampered provenance block causes BROKEN_CHAIN", () => {
      const { fork } = makeForkChain();
      expect(fork.ok).toBe(true);
      if (!fork.ok) return;
      const tampered: Chain = {
        ...fork.value,
        blocks: [
          { ...(fork.value.blocks[0] as GenesisBlock), content: "tampered" },
          ...fork.value.blocks.slice(1),
        ] as Chain["blocks"],
      };
      const result = verifyChain(tampered);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "BROKEN_CHAIN")).toBe(true);
    });

    it("tampered forkSourceBlockHash causes BROKEN_CHAIN", () => {
      const { fork } = makeForkChain();
      expect(fork.ok).toBe(true);
      if (!fork.ok) return;
      const forkGenesisIdx = 3; // forkFromBlock=2, so fork genesis is at index 3
      const forkGenesis = fork.value.blocks[forkGenesisIdx];
      if (!forkGenesis) return;
      const tampered: Chain = {
        ...fork.value,
        blocks: fork.value.blocks.map((b, i) =>
          i === forkGenesisIdx ? { ...b, forkSourceBlockHash: "a".repeat(64) } : b,
        ) as Chain["blocks"],
      };
      const result = verifyChain(tampered);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "BROKEN_CHAIN")).toBe(true);
    });
  });

  describe("contentSchema validation", () => {
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      required: ["decision", "vote"],
      properties: {
        decision: { type: "string" },
        vote: { type: "string", enum: ["unanimous", "majority", "split"] },
      },
      additionalProperties: false,
    };

    function makeSchemaChain() {
      const kp = generateKeypair();
      if (!kp.ok) throw new Error("keygen failed");
      return {
        kp: kp.value,
        chain: createChain(
          {
            content: "genesis",
            purpose: "test",
            creatorId: "user1",
            identityType: "anonymous",
            publicKey: kp.value.publicKey,
            contentSchema: schema,
          },
          kp.value.privateKey,
        ),
      };
    }

    it("schema chain with valid blocks passes", () => {
      const { kp, chain: chainResult } = makeSchemaChain();
      if (!chainResult.ok) throw new Error("createChain failed");
      const r = appendBlock(
        chainResult.value,
        {
          content: JSON.stringify({ decision: "Approve budget", vote: "unanimous" }),
          publicKey: kp.publicKey,
        },
        kp.privateKey,
      );
      if (!r.ok) throw new Error("appendBlock failed");
      const result = verifyChain(r.value, { validateContent: createAjvValidator() });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("schema chain without validator skips validation", () => {
      const { chain: chainResult } = makeSchemaChain();
      if (!chainResult.ok) throw new Error("createChain failed");
      // Manually craft a chain with non-JSON block content bypassing appendBlock validation
      const genesis = chainResult.value.blocks[0] as GenesisBlock;
      const result = verifyChain({ ...chainResult.value, blocks: [genesis] });
      // No validator passed — should pass with no errors
      expect(result.valid).toBe(true);
    });

    it("schema chain with invalid block content causes SCHEMA_VIOLATION", () => {
      const { chain: chainResult } = makeSchemaChain();
      if (!chainResult.ok) throw new Error("createChain failed");
      // Bypass appendBlock validation by directly injecting an invalid block
      const genesis = chainResult.value.blocks[0] as GenesisBlock;
      // We need a real signed block — use a schema-less chain to get one, then graft it
      const kp2 = generateKeypair();
      if (!kp2.ok) throw new Error("keygen2 failed");
      const plain = createChain(
        {
          content: "x",
          purpose: "x",
          creatorId: "x",
          identityType: "anonymous",
          publicKey: kp2.value.publicKey,
        },
        kp2.value.privateKey,
      );
      if (!plain.ok) throw new Error("plain chain failed");
      const r = appendBlock(
        plain.value,
        { content: "not json at all", publicKey: kp2.value.publicKey },
        kp2.value.privateKey,
      );
      if (!r.ok) throw new Error("append failed");
      // Splice the non-JSON block (with wrong chainId/signature — but schema violation fires first)
      const block1 = r.value.blocks[1];
      if (block1 === undefined) throw new Error("block1 missing");
      const invalidBlock = { ...block1, chainId: chainResult.value.metadata.chainId };
      const spliced: Chain = {
        ...chainResult.value,
        blocks: [genesis, invalidBlock as Block],
      };
      const result = verifyChain(spliced, { validateContent: createAjvValidator() });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "SCHEMA_VIOLATION")).toBe(true);
    });
  });
});
