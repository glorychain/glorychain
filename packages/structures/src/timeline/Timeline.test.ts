import type { Chain, GenesisBlock } from "@glorychain/core";
import { describe, expect, it } from "vitest";
import { Timeline } from "./Timeline.js";

function makeChain(events: string[]): Chain {
  const genesis: GenesisBlock = {
    blockNumber: 0,
    chainId: "test-chain",
    content: "Timeline",
    timestamp: "2026-01-01T00:00:00.000Z" as never,
    previousHash: null,
    hash: "genesis-hash",
    signature: "sig",
    publicKey: "pubkey",
    protocolVersion: "0.1",
    creatorId: "test",
    purpose: "timeline",
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

describe("Timeline", () => {
  it("adds entries", () => {
    const chain = makeChain([
      Timeline.entry({ id: "e1", title: "Voted YES on SB-412", tags: ["climate", "vote"] }),
      Timeline.entry({ id: "e2", title: "Committed to net-zero 2035", tags: ["climate", "commitment"] }),
    ]);
    const timeline = Timeline.fromChain(chain);
    expect(timeline.count).toBe(2);
    expect(timeline.get("e1")?.title).toBe("Voted YES on SB-412");
  });

  it("filters by tag", () => {
    const chain = makeChain([
      Timeline.entry({ id: "e1", title: "Vote A", tags: ["climate"] }),
      Timeline.entry({ id: "e2", title: "Vote B", tags: ["housing"] }),
      Timeline.entry({ id: "e3", title: "Vote C", tags: ["climate", "housing"] }),
    ]);
    const timeline = Timeline.fromChain(chain);
    expect(timeline.byTag("climate").map((e) => e.id).sort()).toEqual(["e1", "e3"]);
    expect(timeline.byTag("housing").map((e) => e.id).sort()).toEqual(["e2", "e3"]);
  });

  it("retracts entries", () => {
    const chain = makeChain([
      Timeline.entry({ id: "e1", title: "Vote A" }),
      Timeline.entry({ id: "e2", title: "Vote B" }),
      Timeline.retract({ id: "e1", reason: "entered in error" }),
    ]);
    const timeline = Timeline.fromChain(chain);
    expect(timeline.active).toHaveLength(1);
    expect(timeline.all).toHaveLength(2);
    expect(timeline.get("e1")?.retracted).toBe(true);
  });

  it("collects unique tags", () => {
    const chain = makeChain([
      Timeline.entry({ id: "e1", title: "A", tags: ["climate", "vote"] }),
      Timeline.entry({ id: "e2", title: "B", tags: ["housing", "vote"] }),
    ]);
    const timeline = Timeline.fromChain(chain);
    expect(timeline.tags).toEqual(["climate", "housing", "vote"]);
  });
});
