import type { Chain } from "@glorychain/core";
import { createChain, generateKeypair, verifyChain } from "@glorychain/core";
import type { Suite } from "../runner.js";

export const verifySuites: Suite[] = [
  {
    name: "verify: valid chain returns valid=true",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok)
        return {
          passed: false,
          name: "verify: valid chain returns valid=true",
          error: "keygen failed",
        };
      const chain = createChain(
        {
          content: "valid",
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
          name: "verify: valid chain returns valid=true",
          error: chain.error.message,
        };
      const result = verifyChain(chain.value);
      return { passed: result.valid, name: "verify: valid chain returns valid=true" };
    },
  },
  {
    name: "verify: tampered content returns valid=false",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok)
        return {
          passed: false,
          name: "verify: tampered content returns valid=false",
          error: "keygen failed",
        };
      const chain = createChain(
        {
          content: "original",
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
          name: "verify: tampered content returns valid=false",
          error: chain.error.message,
        };
      const tampered: Chain = {
        ...chain.value,
        blocks: [
          { ...chain.value.blocks[0], content: "tampered" },
          ...chain.value.blocks.slice(1),
        ] as Chain["blocks"],
      };
      const result = verifyChain(tampered);
      return {
        passed: !result.valid,
        name: "verify: tampered content returns valid=false",
        ...(result.valid ? { error: "expected invalid but got valid" } : {}),
      };
    },
  },
];
