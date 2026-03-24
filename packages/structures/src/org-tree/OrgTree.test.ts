import type { Chain, GenesisBlock } from "@glorychain/core";
import { describe, expect, it } from "vitest";
import { OrgTree } from "./OrgTree.js";

function makeChain(events: string[]): Chain {
  const genesis: GenesisBlock = {
    blockNumber: 0,
    chainId: "test-chain",
    content: "Acme Corp org chart",
    timestamp: "2026-01-01T00:00:00.000Z" as never,
    previousHash: null,
    hash: "genesis-hash",
    signature: "sig",
    publicKey: "pubkey",
    protocolVersion: "0.1",
    creatorId: "test",
    purpose: "org chart",
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

describe("OrgTree", () => {
  it("builds tree from APPOINT events", () => {
    const chain = makeChain([
      OrgTree.appoint({ id: "sarah", name: "Sarah Chen", role: "CEO", reportsTo: null }),
      OrgTree.appoint({ id: "james", name: "James Okafor", role: "VP Eng", reportsTo: "sarah" }),
      OrgTree.appoint({ id: "liu", name: "Liu Wei", role: "Staff Engineer", reportsTo: "james" }),
    ]);

    const tree = OrgTree.fromChain(chain);

    expect(tree.get("sarah")).toMatchObject({ name: "Sarah Chen", role: "CEO", reportsTo: null });
    expect(tree.get("james")).toMatchObject({ reportsTo: "sarah" });
    expect(tree.headcount).toBe(3);
  });

  it("removes member on DEPART and reassigns reports", () => {
    const chain = makeChain([
      OrgTree.appoint({ id: "sarah", name: "Sarah Chen", role: "CEO", reportsTo: null }),
      OrgTree.appoint({ id: "james", name: "James Okafor", role: "VP Eng", reportsTo: "sarah" }),
      OrgTree.appoint({ id: "liu", name: "Liu Wei", role: "Staff Engineer", reportsTo: "james" }),
      OrgTree.depart({ id: "james", reason: "resigned", handoverTo: "sarah" }),
    ]);

    const tree = OrgTree.fromChain(chain);

    expect(tree.get("james")?.active).toBe(false);
    expect(tree.get("liu")?.reportsTo).toBe("sarah");
    expect(tree.headcount).toBe(2);
  });

  it("promotes a member", () => {
    const chain = makeChain([
      OrgTree.appoint({ id: "sarah", name: "Sarah Chen", role: "CEO", reportsTo: null }),
      OrgTree.appoint({ id: "liu", name: "Liu Wei", role: "Staff Engineer", reportsTo: "sarah" }),
      OrgTree.promote({ id: "liu", role: "Principal Engineer" }),
    ]);

    const tree = OrgTree.fromChain(chain);
    expect(tree.get("liu")?.role).toBe("Principal Engineer");
  });

  it("returns correct directReports", () => {
    const chain = makeChain([
      OrgTree.appoint({ id: "sarah", name: "Sarah Chen", role: "CEO", reportsTo: null }),
      OrgTree.appoint({ id: "james", name: "James Okafor", role: "VP Eng", reportsTo: "sarah" }),
      OrgTree.appoint({
        id: "priya",
        name: "Priya Sharma",
        role: "VP Product",
        reportsTo: "sarah",
      }),
    ]);

    const tree = OrgTree.fromChain(chain);
    const reports = tree.directReports("sarah");
    expect(reports.map((m) => m.id).sort()).toEqual(["james", "priya"]);
  });

  it("returns correct pathTo", () => {
    const chain = makeChain([
      OrgTree.appoint({ id: "sarah", name: "Sarah Chen", role: "CEO", reportsTo: null }),
      OrgTree.appoint({ id: "james", name: "James Okafor", role: "VP Eng", reportsTo: "sarah" }),
      OrgTree.appoint({ id: "liu", name: "Liu Wei", role: "Staff Engineer", reportsTo: "james" }),
    ]);

    const tree = OrgTree.fromChain(chain);
    const path = tree.pathTo("liu").map((m) => m.id);
    expect(path).toEqual(["sarah", "james", "liu"]);
  });

  it("returns subtree recursively", () => {
    const chain = makeChain([
      OrgTree.appoint({ id: "sarah", name: "Sarah Chen", role: "CEO", reportsTo: null }),
      OrgTree.appoint({ id: "james", name: "James Okafor", role: "VP Eng", reportsTo: "sarah" }),
      OrgTree.appoint({ id: "liu", name: "Liu Wei", role: "Staff Engineer", reportsTo: "james" }),
      OrgTree.appoint({ id: "ana", name: "Ana Costa", role: "Engineer", reportsTo: "liu" }),
    ]);

    const tree = OrgTree.fromChain(chain);
    const sub = tree
      .subtree("sarah")
      .map((m) => m.id)
      .sort();
    expect(sub).toEqual(["ana", "james", "liu"]);
  });

  it("suspends and reinstates", () => {
    const chain = makeChain([
      OrgTree.appoint({ id: "sarah", name: "Sarah Chen", role: "CEO", reportsTo: null }),
      OrgTree.suspend({ id: "sarah" }),
    ]);

    const tree1 = OrgTree.fromChain(chain);
    expect(tree1.get("sarah")?.suspended).toBe(true);
    // Still active — suspended ≠ departed
    expect(tree1.get("sarah")?.active).toBe(true);

    const chain2 = makeChain([
      OrgTree.appoint({ id: "sarah", name: "Sarah Chen", role: "CEO", reportsTo: null }),
      OrgTree.suspend({ id: "sarah" }),
      OrgTree.reinstate({ id: "sarah" }),
    ]);
    const tree2 = OrgTree.fromChain(chain2);
    expect(tree2.get("sarah")?.suspended).toBe(false);
  });

  it("skips non-org-event blocks gracefully", () => {
    const chain = makeChain([
      OrgTree.appoint({ id: "sarah", name: "Sarah Chen", role: "CEO", reportsTo: null }),
      "not json at all",
      '{"type":"UNKNOWN","id":"x"}',
      OrgTree.appoint({ id: "james", name: "James Okafor", role: "VP Eng", reportsTo: "sarah" }),
    ]);

    const tree = OrgTree.fromChain(chain);
    expect(tree.headcount).toBe(2);
  });
});
