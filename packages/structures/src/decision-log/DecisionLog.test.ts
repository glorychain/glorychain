import type { Chain, GenesisBlock } from "@glorychain/core";
import { describe, expect, it } from "vitest";
import { DecisionLog } from "./DecisionLog.js";

function makeChain(events: string[]): Chain {
  const genesis: GenesisBlock = {
    blockNumber: 0,
    chainId: "test-chain",
    content: "Decision log",
    timestamp: "2026-01-01T00:00:00.000Z" as never,
    previousHash: null,
    hash: "genesis-hash",
    signature: "sig",
    publicKey: "pubkey",
    protocolVersion: "0.1",
    creatorId: "test",
    purpose: "decisions",
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

describe("DecisionLog", () => {
  it("records a decision", () => {
    const chain = makeChain([
      DecisionLog.record({
        id: "ADR-001",
        title: "Use RocksDB",
        body: "Chosen for column families.",
      }),
    ]);
    const log = DecisionLog.fromChain(chain);
    expect(log.get("ADR-001")?.title).toBe("Use RocksDB");
    expect(log.active).toHaveLength(1);
  });

  it("supersedes a decision", () => {
    const chain = makeChain([
      DecisionLog.record({
        id: "ADR-001",
        title: "Use RocksDB",
        body: "Chosen for column families.",
      }),
      DecisionLog.record({
        id: "ADR-002",
        title: "Use custom LSM",
        body: "Licence incompatibility.",
      }),
      DecisionLog.supersede({ id: "ADR-001", supersededBy: "ADR-002" }),
    ]);
    const log = DecisionLog.fromChain(chain);
    expect(log.get("ADR-001")?.status).toBe("superseded");
    expect(log.get("ADR-001")?.supersededBy).toBe("ADR-002");
    expect(log.active).toHaveLength(1);
    expect(log.superseded).toHaveLength(1);
  });

  it("withdraws a decision", () => {
    const chain = makeChain([
      DecisionLog.record({
        id: "ADR-001",
        title: "Use RocksDB",
        body: "Chosen for column families.",
      }),
      DecisionLog.withdraw({ id: "ADR-001", reason: "Abandoned approach" }),
    ]);
    const log = DecisionLog.fromChain(chain);
    expect(log.get("ADR-001")?.status).toBe("withdrawn");
    expect(log.active).toHaveLength(0);
  });

  it("annotates a decision", () => {
    const chain = makeChain([
      DecisionLog.record({
        id: "ADR-001",
        title: "Use RocksDB",
        body: "Chosen for column families.",
      }),
      DecisionLog.annotate({ id: "ADR-001", note: "Still valid as of Q2 2026." }),
    ]);
    const log = DecisionLog.fromChain(chain);
    expect(log.get("ADR-001")?.annotations).toEqual(["Still valid as of Q2 2026."]);
  });

  it("lineage follows supersession chain", () => {
    const chain = makeChain([
      DecisionLog.record({ id: "ADR-001", title: "Use RocksDB", body: "Original." }),
      DecisionLog.record({ id: "ADR-002", title: "Custom LSM", body: "Replacement." }),
      DecisionLog.record({ id: "ADR-003", title: "BTreeMap", body: "Final." }),
      DecisionLog.supersede({ id: "ADR-001", supersededBy: "ADR-002" }),
      DecisionLog.supersede({ id: "ADR-002", supersededBy: "ADR-003" }),
    ]);
    const log = DecisionLog.fromChain(chain);
    const lineage = log.lineage("ADR-001");
    expect(lineage.map((d) => d.id)).toEqual(["ADR-001", "ADR-002", "ADR-003"]);
  });
});
