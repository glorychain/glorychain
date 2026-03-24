import type { Chain, GenesisBlock } from "@glorychain/core";
import { describe, expect, it } from "vitest";
import { DocumentRegister } from "./DocumentRegister.js";

function makeChain(events: string[]): Chain {
  const genesis: GenesisBlock = {
    blockNumber: 0,
    chainId: "test-chain",
    content: "Document register",
    timestamp: "2026-01-01T00:00:00.000Z" as never,
    previousHash: null,
    hash: "genesis-hash",
    signature: "sig",
    publicKey: "pubkey",
    protocolVersion: "0.1",
    creatorId: "test",
    purpose: "documents",
    identityType: "anonymous",
    hashAlgorithm: "sha256",
    signatureScheme: "ed25519",
  };

  const blocks = events.map((content, i) => ({
    blockNumber: i + 1,
    chainId: "test-chain",
    content,
    timestamp: `2026-01-0${i + 2}T00:00:00.000Z` as never,
    previousHash: `hash-${i}`,
    hash: `hash-${i + 1}`,
    signature: "sig",
    publicKey: "pubkey",
    protocolVersion: "0.1",
  }));

  return { blocks: [genesis, ...blocks] } as unknown as Chain;
}

describe("DocumentRegister", () => {
  it("publishes a document", () => {
    const chain = makeChain([
      DocumentRegister.publish({
        id: "policy-001",
        title: "Safeguarding Policy",
        hash: "abc123",
        version: "1.0",
      }),
    ]);
    const register = DocumentRegister.fromChain(chain);
    expect(register.get("policy-001")?.title).toBe("Safeguarding Policy");
    expect(register.current).toHaveLength(1);
  });

  it("supersedes a document", () => {
    const chain = makeChain([
      DocumentRegister.publish({ id: "policy-001", title: "Safeguarding v1", hash: "abc123" }),
      DocumentRegister.publish({ id: "policy-002", title: "Safeguarding v2", hash: "def456" }),
      DocumentRegister.supersede({ id: "policy-001", supersededBy: "policy-002" }),
    ]);
    const register = DocumentRegister.fromChain(chain);
    expect(register.get("policy-001")?.status).toBe("superseded");
    expect(register.get("policy-001")?.supersededBy).toBe("policy-002");
    expect(register.current).toHaveLength(1);
  });

  it("withdraws a document", () => {
    const chain = makeChain([
      DocumentRegister.publish({ id: "policy-001", title: "Safeguarding v1", hash: "abc123" }),
      DocumentRegister.withdraw({ id: "policy-001", reason: "policy rescinded" }),
    ]);
    const register = DocumentRegister.fromChain(chain);
    expect(register.get("policy-001")?.status).toBe("withdrawn");
    expect(register.current).toHaveLength(0);
  });

  it("finds document by hash", () => {
    const chain = makeChain([
      DocumentRegister.publish({ id: "policy-001", title: "Safeguarding v1", hash: "abc123" }),
    ]);
    const register = DocumentRegister.fromChain(chain);
    expect(register.byHash("abc123")?.id).toBe("policy-001");
    expect(register.byHash("notaHash")).toBeUndefined();
  });

  it("restores a withdrawn document", () => {
    const chain = makeChain([
      DocumentRegister.publish({ id: "policy-001", title: "Safeguarding v1", hash: "abc123" }),
      DocumentRegister.withdraw({ id: "policy-001" }),
      DocumentRegister.restore({ id: "policy-001" }),
    ]);
    const register = DocumentRegister.fromChain(chain);
    expect(register.get("policy-001")?.status).toBe("current");
  });
});
