import type { Chain } from "@glorychain/core";
import { appendBlock, createChain, generateKeypair, verifyChain } from "@glorychain/core";
import type { Suite } from "../runner.js";

export const replaySuites: Suite[] = [
  {
    name: "replay: block from chain A injected into chain B fails verification (FR12)",
    run: async () => {
      const name = "replay: block from chain A injected into chain B fails verification (FR12)";
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name, error: "keygen failed" };
      const chainA = createChain(
        {
          content: "chain A genesis",
          purpose: "test",
          creatorId: "tester",
          identityType: "anonymous",
          publicKey: kp.value.publicKey,
        },
        kp.value.privateKey,
      );
      if (!chainA.ok) return { passed: false, name, error: chainA.error.message };
      const chainAWith2 = appendBlock(
        chainA.value,
        { content: "chain A block 1", publicKey: kp.value.publicKey },
        kp.value.privateKey,
      );
      if (!chainAWith2.ok) return { passed: false, name, error: chainAWith2.error.message };
      const chainB = createChain(
        {
          content: "chain B genesis",
          purpose: "test",
          creatorId: "tester",
          identityType: "anonymous",
          publicKey: kp.value.publicKey,
        },
        kp.value.privateKey,
      );
      if (!chainB.ok) return { passed: false, name, error: chainB.error.message };
      // Inject block 1 from chain A into chain B
      const replayBlock = chainAWith2.value.blocks[1];
      if (!replayBlock) return { passed: false, name, error: "no block to replay" };
      const tampered: Chain = {
        ...chainB.value,
        blocks: [chainB.value.blocks[0], replayBlock] as Chain["blocks"],
      };
      const result = verifyChain(tampered);
      return {
        passed: !result.valid,
        name,
        ...(result.valid ? { error: "replay attack not detected — chainId check missing" } : {}),
      };
    },
  },
];
