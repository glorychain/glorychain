import { createChain, generateKeypair, verifyChain } from "@glorychain/core";
import type { Suite } from "../runner.js";

function makeInput(kp: { publicKey: string }) {
  return {
    content: "genesis conformance test",
    purpose: "conformance",
    creatorId: "conformance-runner",
    identityType: "anonymous" as const,
    publicKey: kp.publicKey,
  };
}

export const genesisSuites: Suite[] = [
  {
    name: "genesis: blockNumber is 0",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok)
        return { passed: false, name: "genesis: blockNumber is 0", error: "keygen failed" };
      const result = createChain(makeInput(kp.value), kp.value.privateKey);
      if (!result.ok)
        return { passed: false, name: "genesis: blockNumber is 0", error: result.error.message };
      const passed = result.value.blocks[0]?.blockNumber === 0;
      return { passed, name: "genesis: blockNumber is 0" };
    },
  },
  {
    name: "genesis: chain verifies as valid",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok)
        return { passed: false, name: "genesis: chain verifies as valid", error: "keygen failed" };
      const result = createChain(makeInput(kp.value), kp.value.privateKey);
      if (!result.ok)
        return {
          passed: false,
          name: "genesis: chain verifies as valid",
          error: result.error.message,
        };
      const verification = verifyChain(result.value);
      return {
        passed: verification.valid,
        name: "genesis: chain verifies as valid",
        ...(verification.valid ? {} : { error: verification.errors.join(", ") }),
      };
    },
  },
  {
    name: "genesis: has chainId and protocolVersion",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok)
        return {
          passed: false,
          name: "genesis: has chainId and protocolVersion",
          error: "keygen failed",
        };
      const result = createChain(makeInput(kp.value), kp.value.privateKey);
      if (!result.ok)
        return {
          passed: false,
          name: "genesis: has chainId and protocolVersion",
          error: result.error.message,
        };
      const { metadata } = result.value;
      const passed =
        typeof metadata.chainId === "string" &&
        metadata.chainId.length > 0 &&
        typeof metadata.protocolVersion === "string";
      return { passed, name: "genesis: has chainId and protocolVersion" };
    },
  },
];
