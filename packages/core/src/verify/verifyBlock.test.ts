import { describe, expect, it } from "vitest";
import { createChain } from "../chain/create.js";
import { generateKeypair } from "../crypto/keygen.js";
import { verifySingleBlock } from "./verifyBlock.js";

function makeGenesis() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain = createChain(
    {
      content: "hello",
      purpose: "test",
      creatorId: "user1",
      identityType: "anonymous",
      publicKey: kp.value.publicKey,
    },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  const genesis = chain.value.blocks[0];
  if (!genesis) throw new Error("no genesis block");
  return { genesis, metadata: chain.value.metadata };
}

describe("verifySingleBlock", () => {
  it("valid genesis block passes verification", () => {
    const { genesis, metadata } = makeGenesis();
    const result = verifySingleBlock(genesis, metadata.hashAlgorithm, metadata.signatureScheme);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.blockCount).toBe(1);
    expect(result.lastVerifiedBlock).toBe(0);
  });

  it("tampered content causes BROKEN_CHAIN", () => {
    const { genesis, metadata } = makeGenesis();
    const tampered = { ...genesis, content: "tampered" };
    const result = verifySingleBlock(tampered, metadata.hashAlgorithm, metadata.signatureScheme);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "BROKEN_CHAIN")).toBe(true);
  });

  it("tampered hash causes BROKEN_CHAIN", () => {
    const { genesis, metadata } = makeGenesis();
    const tampered = { ...genesis, hash: "a".repeat(64) };
    const result = verifySingleBlock(tampered, metadata.hashAlgorithm, metadata.signatureScheme);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "BROKEN_CHAIN")).toBe(true);
  });

  it("tampered signature causes INVALID_SIGNATURE", () => {
    const { genesis, metadata } = makeGenesis();
    // Use a valid-format but wrong base64url signature
    const kp2 = generateKeypair();
    if (!kp2.ok) throw new Error("keygen2 failed");
    const wrongSig = generateKeypair();
    if (!wrongSig.ok) throw new Error("keygen3 failed");
    // Replace signature with one signed by a different key — still valid base64url
    const tampered = { ...genesis, signature: wrongSig.value.publicKey };
    const result = verifySingleBlock(tampered, metadata.hashAlgorithm, metadata.signatureScheme);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_SIGNATURE")).toBe(true);
  });
});
