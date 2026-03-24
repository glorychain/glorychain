import type { Chain, GenesisBlock } from "@glorychain/core";
import { describe, expect, it } from "vitest";
import { MemberSet } from "./MemberSet.js";

function makeChain(events: string[]): Chain {
  const genesis: GenesisBlock = {
    blockNumber: 0,
    chainId: "test-chain",
    content: "Board member register",
    timestamp: "2026-01-01T00:00:00.000Z" as never,
    previousHash: null,
    hash: "genesis-hash",
    signature: "sig",
    publicKey: "pubkey",
    protocolVersion: "0.1",
    creatorId: "test",
    purpose: "membership",
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

describe("MemberSet", () => {
  it("tracks joins", () => {
    const chain = makeChain([
      MemberSet.join({ id: "alice", name: "Alice Nakamura", role: "board-member" }),
      MemberSet.join({ id: "bob", name: "Bob Osei", role: "board-member" }),
    ]);

    const set = MemberSet.fromChain(chain);
    expect(set.headcount).toBe(2);
    expect(set.get("alice")?.name).toBe("Alice Nakamura");
  });

  it("marks departed members as inactive", () => {
    const chain = makeChain([
      MemberSet.join({ id: "alice", name: "Alice Nakamura", role: "board-member" }),
      MemberSet.leave({ id: "alice", reason: "resigned" }),
    ]);

    const set = MemberSet.fromChain(chain);
    expect(set.get("alice")?.active).toBe(false);
    expect(set.headcount).toBe(0);
    expect(set.all).toHaveLength(1);
  });

  it("changes role", () => {
    const chain = makeChain([
      MemberSet.join({ id: "alice", name: "Alice Nakamura", role: "observer" }),
      MemberSet.roleChange({ id: "alice", role: "board-member" }),
    ]);

    const set = MemberSet.fromChain(chain);
    expect(set.get("alice")?.role).toBe("board-member");
  });

  it("byRole returns correct members", () => {
    const chain = makeChain([
      MemberSet.join({ id: "alice", name: "Alice", role: "board-member" }),
      MemberSet.join({ id: "bob", name: "Bob", role: "observer" }),
      MemberSet.join({ id: "carol", name: "Carol", role: "board-member" }),
    ]);

    const set = MemberSet.fromChain(chain);
    expect(
      set
        .byRole("board-member")
        .map((m) => m.id)
        .sort(),
    ).toEqual(["alice", "carol"]);
    expect(set.byRole("observer").map((m) => m.id)).toEqual(["bob"]);
  });

  it("current excludes suspended", () => {
    const chain = makeChain([
      MemberSet.join({ id: "alice", name: "Alice", role: "board-member" }),
      MemberSet.join({ id: "bob", name: "Bob", role: "board-member" }),
      MemberSet.suspend({ id: "bob" }),
    ]);

    const set = MemberSet.fromChain(chain);
    expect(set.active).toHaveLength(2); // suspended but still active
    expect(set.current).toHaveLength(1); // only non-suspended
    expect(set.current[0]?.id).toBe("alice");
  });
});
