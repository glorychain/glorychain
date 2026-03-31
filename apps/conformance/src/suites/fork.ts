import type { ForkGenesisBlock } from "@glorychain/core";
import { createChain, forkChain, generateKeypair, recordForkOnSource } from "@glorychain/core";
import type { Suite } from "../runner.js";

export const forkSuites: Suite[] = [
  {
    name: "fork: forked chain has blockNumber 0",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok)
        return {
          passed: false,
          name: "fork: forked chain has blockNumber 0",
          error: "keygen failed",
        };
      const source = createChain(
        {
          content: "source",
          purpose: "test",
          creatorId: "tester",
          identityType: "anonymous",
          publicKey: kp.value.publicKey,
        },
        kp.value.privateKey,
      );
      if (!source.ok)
        return {
          passed: false,
          name: "fork: forked chain has blockNumber 0",
          error: source.error.message,
        };
      const forked = forkChain(
        source.value,
        0,
        {
          content: "fork",
          purpose: "fork-test",
          creatorId: "tester",
          identityType: "anonymous",
          publicKey: kp.value.publicKey,
        },
        kp.value.privateKey,
      );
      if (!forked.ok)
        return {
          passed: false,
          name: "fork: forked chain has blockNumber 0",
          error: forked.error.message,
        };
      const passed = forked.value.blocks[0]?.blockNumber === 0;
      return { passed, name: "fork: forked chain has blockNumber 0" };
    },
  },
  {
    name: "fork: recordForkOnSource round-trip — knownForks entry matches fork chain",
    run: async () => {
      const suiteName = "fork: recordForkOnSource round-trip — knownForks entry matches fork chain";
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name: suiteName, error: "keygen failed" };
      const source = createChain(
        {
          content: "source",
          purpose: "test",
          creatorId: "tester",
          identityType: "anonymous",
          publicKey: kp.value.publicKey,
        },
        kp.value.privateKey,
      );
      if (!source.ok) return { passed: false, name: suiteName, error: source.error.message };
      const forked = forkChain(
        source.value,
        0,
        {
          content: "fork",
          purpose: "fork-test",
          creatorId: "tester",
          identityType: "anonymous",
          publicKey: kp.value.publicKey,
        },
        kp.value.privateKey,
      );
      if (!forked.ok) return { passed: false, name: suiteName, error: forked.error.message };
      const forkGenesisBlock = forked.value.blocks.find((b) => !b.provenance) as
        | ForkGenesisBlock
        | undefined;
      if (!forkGenesisBlock)
        return { passed: false, name: suiteName, error: "fork genesis not found" };
      const updated = recordForkOnSource(
        source.value,
        forked.value.metadata.chainId,
        forkGenesisBlock.forkFromBlock,
        forkGenesisBlock.forkSourceBlockHash,
      );
      const ref = updated.metadata.knownForks[0];
      if (!ref) return { passed: false, name: suiteName, error: "no knownForks entry" };
      const passed =
        ref.forkChainId === forked.value.metadata.chainId &&
        ref.forkFromBlock === forkGenesisBlock.forkFromBlock &&
        ref.forkSourceBlockHash === forkGenesisBlock.forkSourceBlockHash &&
        typeof ref.createdAt === "string" &&
        ref.createdAt.length > 0;
      return { passed, name: suiteName };
    },
  },
  {
    name: "fork: provenance blocks carry correct metadata",
    run: async () => {
      const suiteName = "fork: provenance blocks carry correct metadata";
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name: suiteName, error: "keygen failed" };
      const source = createChain(
        {
          content: "source",
          purpose: "test",
          creatorId: "tester",
          identityType: "anonymous",
          publicKey: kp.value.publicKey,
        },
        kp.value.privateKey,
      );
      if (!source.ok) return { passed: false, name: suiteName, error: source.error.message };
      const forkFromBlockNumber = 0;
      const forked = forkChain(
        source.value,
        forkFromBlockNumber,
        {
          content: "fork",
          purpose: "fork-test",
          creatorId: "tester",
          identityType: "anonymous",
          publicKey: kp.value.publicKey,
        },
        kp.value.privateKey,
      );
      if (!forked.ok) return { passed: false, name: suiteName, error: forked.error.message };
      const provenanceBlocks = forked.value.blocks.slice(0, forkFromBlockNumber + 1);
      const allProvenance = provenanceBlocks.every((b) => b.provenance === true);
      const hashesMatch = provenanceBlocks.every((b, i) => b.hash === source.value.blocks[i]?.hash);
      const forkGenesis = forked.value.blocks.find((b) => !b.provenance) as
        | ForkGenesisBlock
        | undefined;
      const forkOfCorrect = forkGenesis?.forkOf === source.value.metadata.chainId;
      const forkHashCorrect =
        forkGenesis?.forkSourceBlockHash === source.value.blocks[forkFromBlockNumber]?.hash;
      const passed = allProvenance && hashesMatch && forkOfCorrect && forkHashCorrect;
      return { passed, name: suiteName };
    },
  },
  {
    name: "fork: multi-level ancestry — C forks B forks A",
    run: async () => {
      const suiteName = "fork: multi-level ancestry — C forks B forks A";
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name: suiteName, error: "keygen failed" };
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
      if (!aResult.ok) return { passed: false, name: suiteName, error: aResult.error.message };
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
      if (!bResult.ok) return { passed: false, name: suiteName, error: bResult.error.message };
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
      if (!cResult.ok) return { passed: false, name: suiteName, error: cResult.error.message };
      const chainC = cResult.value;
      // C's fork genesis forkOf === B's chainId
      const cForkGenesis = chainC.blocks.find((b) => !b.provenance) as ForkGenesisBlock | undefined;
      const cForkOfIsB = cForkGenesis?.forkOf === chainB.metadata.chainId;
      // C's provenance blocks contain at least one block with forkOf set (B's fork genesis)
      const provenanceWithForkOf = chainC.blocks
        .filter((b) => b.provenance === true)
        .some((b) => (b as unknown as { forkOf?: string }).forkOf !== undefined);
      const passed = cForkOfIsB && provenanceWithForkOf;
      return { passed, name: suiteName };
    },
  },
  {
    name: "fork: forked chain has different chainId than source",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok)
        return {
          passed: false,
          name: "fork: forked chain has different chainId than source",
          error: "keygen failed",
        };
      const source = createChain(
        {
          content: "source",
          purpose: "test",
          creatorId: "tester",
          identityType: "anonymous",
          publicKey: kp.value.publicKey,
        },
        kp.value.privateKey,
      );
      if (!source.ok)
        return {
          passed: false,
          name: "fork: forked chain has different chainId than source",
          error: source.error.message,
        };
      const forked = forkChain(
        source.value,
        0,
        {
          content: "fork",
          purpose: "fork-test",
          creatorId: "tester",
          identityType: "anonymous",
          publicKey: kp.value.publicKey,
        },
        kp.value.privateKey,
      );
      if (!forked.ok)
        return {
          passed: false,
          name: "fork: forked chain has different chainId than source",
          error: forked.error.message,
        };
      const passed = forked.value.metadata.chainId !== source.value.metadata.chainId;
      return { passed, name: "fork: forked chain has different chainId than source" };
    },
  },
];
