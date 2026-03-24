import type { Chain, GenesisBlock } from "@glorychain/core";
import { describe, expect, it } from "vitest";
import { VoteRegister } from "./VoteRegister.js";

function makeChain(events: string[]): Chain {
  const genesis: GenesisBlock = {
    blockNumber: 0,
    chainId: "test-chain",
    content: "Vote register",
    timestamp: "2026-01-01T00:00:00.000Z" as never,
    previousHash: null,
    hash: "genesis-hash",
    signature: "sig",
    publicKey: "pubkey",
    protocolVersion: "0.1",
    creatorId: "test",
    purpose: "votes",
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

describe("VoteRegister", () => {
  it("records a motion", () => {
    const chain = makeChain([
      VoteRegister.motion({ id: "m1", title: "Approve budget", proposedBy: "alice" }),
    ]);
    const register = VoteRegister.fromChain(chain);
    expect(register.get("m1")?.title).toBe("Approve budget");
    expect(register.open).toHaveLength(1);
  });

  it("casts votes and tallies correctly", () => {
    const chain = makeChain([
      VoteRegister.motion({ id: "m1", title: "Approve budget" }),
      VoteRegister.cast({ motionId: "m1", voterId: "alice", vote: "yes" }),
      VoteRegister.cast({ motionId: "m1", voterId: "bob", vote: "yes" }),
      VoteRegister.cast({ motionId: "m1", voterId: "carol", vote: "no" }),
      VoteRegister.cast({ motionId: "m1", voterId: "dave", vote: "abstain" }),
    ]);
    const register = VoteRegister.fromChain(chain);
    const tally = register.tally("m1");
    expect(tally).toEqual({ yes: 2, no: 1, abstain: 1, total: 4 });
  });

  it("changing vote replaces previous", () => {
    const chain = makeChain([
      VoteRegister.motion({ id: "m1", title: "Approve budget" }),
      VoteRegister.cast({ motionId: "m1", voterId: "alice", vote: "no" }),
      VoteRegister.cast({ motionId: "m1", voterId: "alice", vote: "yes" }),
    ]);
    const register = VoteRegister.fromChain(chain);
    const tally = register.tally("m1");
    expect(tally?.yes).toBe(1);
    expect(tally?.no).toBe(0);
  });

  it("closes a motion with derived outcome", () => {
    const chain = makeChain([
      VoteRegister.motion({ id: "m1", title: "Approve budget" }),
      VoteRegister.cast({ motionId: "m1", voterId: "alice", vote: "yes" }),
      VoteRegister.cast({ motionId: "m1", voterId: "bob", vote: "no" }),
      VoteRegister.cast({ motionId: "m1", voterId: "carol", vote: "yes" }),
      VoteRegister.close({ motionId: "m1" }),
    ]);
    const register = VoteRegister.fromChain(chain);
    expect(register.get("m1")?.status).toBe("passed");
    expect(register.open).toHaveLength(0);
    expect(register.passed).toHaveLength(1);
  });

  it("withdraws a motion", () => {
    const chain = makeChain([
      VoteRegister.motion({ id: "m1", title: "Approve budget" }),
      VoteRegister.withdraw({ motionId: "m1", reason: "tabled for next meeting" }),
    ]);
    const register = VoteRegister.fromChain(chain);
    expect(register.get("m1")?.status).toBe("withdrawn");
    expect(register.withdrawn).toHaveLength(1);
  });

  it("ignores votes on closed motions", () => {
    const chain = makeChain([
      VoteRegister.motion({ id: "m1", title: "Approve budget" }),
      VoteRegister.close({ motionId: "m1", outcome: "failed" }),
      VoteRegister.cast({ motionId: "m1", voterId: "alice", vote: "yes" }),
    ]);
    const register = VoteRegister.fromChain(chain);
    expect(register.tally("m1")?.total).toBe(0);
  });
});
