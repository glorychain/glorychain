import { createChain, forkChain, generateKeypair } from "@glorychain/core";
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
