import { appendBlock, createChain, generateKeypair, verifyChain } from "@glorychain/core";
import type { Suite } from "../runner.js";

export const appendSuites: Suite[] = [
  {
    name: "append: second block has blockNumber 1",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok)
        return {
          passed: false,
          name: "append: second block has blockNumber 1",
          error: "keygen failed",
        };
      const chain = createChain(
        {
          content: "genesis",
          purpose: "test",
          creatorId: "tester",
          identityType: "anonymous",
          publicKey: kp.value.publicKey,
        },
        kp.value.privateKey,
      );
      if (!chain.ok)
        return {
          passed: false,
          name: "append: second block has blockNumber 1",
          error: chain.error.message,
        };
      const appended = appendBlock(
        chain.value,
        { content: "block 1", publicKey: kp.value.publicKey },
        kp.value.privateKey,
      );
      if (!appended.ok)
        return {
          passed: false,
          name: "append: second block has blockNumber 1",
          error: appended.error.message,
        };
      const passed = appended.value.blocks[1]?.blockNumber === 1;
      return { passed, name: "append: second block has blockNumber 1" };
    },
  },
  {
    name: "append: previousHash matches genesis hash",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok)
        return {
          passed: false,
          name: "append: previousHash matches genesis hash",
          error: "keygen failed",
        };
      const chain = createChain(
        {
          content: "genesis",
          purpose: "test",
          creatorId: "tester",
          identityType: "anonymous",
          publicKey: kp.value.publicKey,
        },
        kp.value.privateKey,
      );
      if (!chain.ok)
        return {
          passed: false,
          name: "append: previousHash matches genesis hash",
          error: chain.error.message,
        };
      const appended = appendBlock(
        chain.value,
        { content: "block 1", publicKey: kp.value.publicKey },
        kp.value.privateKey,
      );
      if (!appended.ok)
        return {
          passed: false,
          name: "append: previousHash matches genesis hash",
          error: appended.error.message,
        };
      const genesisHash = appended.value.blocks[0]?.hash;
      const prevHash = appended.value.blocks[1]?.previousHash;
      const passed = genesisHash === prevHash;
      return {
        passed,
        name: "append: previousHash matches genesis hash",
        ...(passed ? {} : { error: `genesis=${genesisHash}, prev=${prevHash}` }),
      };
    },
  },
  {
    name: "append: multi-block chain verifies as valid",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok)
        return {
          passed: false,
          name: "append: multi-block chain verifies as valid",
          error: "keygen failed",
        };
      const chain = createChain(
        {
          content: "genesis",
          purpose: "test",
          creatorId: "tester",
          identityType: "anonymous",
          publicKey: kp.value.publicKey,
        },
        kp.value.privateKey,
      );
      if (!chain.ok)
        return {
          passed: false,
          name: "append: multi-block chain verifies as valid",
          error: chain.error.message,
        };
      const appended = appendBlock(
        chain.value,
        { content: "block 1", publicKey: kp.value.publicKey },
        kp.value.privateKey,
      );
      if (!appended.ok)
        return {
          passed: false,
          name: "append: multi-block chain verifies as valid",
          error: appended.error.message,
        };
      const verification = verifyChain(appended.value);
      return {
        passed: verification.valid,
        name: "append: multi-block chain verifies as valid",
        ...(verification.valid ? {} : { error: verification.errors.join(", ") }),
      };
    },
  },
];
