import type { Chain, GenesisBlock } from "@glorychain/core";
import { describe, expect, it } from "vitest";
import { AccessList } from "./AccessList.js";

function makeChain(events: string[]): Chain {
  const genesis: GenesisBlock = {
    blockNumber: 0,
    chainId: "test-chain",
    content: "Access list",
    timestamp: "2026-01-01T00:00:00.000Z" as never,
    previousHash: null,
    hash: "genesis-hash",
    signature: "sig",
    publicKey: "pubkey",
    protocolVersion: "0.1",
    creatorId: "test",
    purpose: "access",
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

describe("AccessList", () => {
  it("grants access", () => {
    const chain = makeChain([
      AccessList.grant({ id: "alice@example.com", label: "Alice", grantedBy: "admin" }),
    ]);
    const list = AccessList.fromChain(chain);
    expect(list.isGranted("alice@example.com")).toBe(true);
    expect(list.granted).toHaveLength(1);
  });

  it("revokes access", () => {
    const chain = makeChain([
      AccessList.grant({ id: "alice@example.com" }),
      AccessList.revoke({ id: "alice@example.com", reason: "left org" }),
    ]);
    const list = AccessList.fromChain(chain);
    expect(list.isGranted("alice@example.com")).toBe(false);
    expect(list.revoked).toHaveLength(1);
  });

  it("returns false for unknown ids", () => {
    const chain = makeChain([]);
    const list = AccessList.fromChain(chain);
    expect(list.isGranted("unknown@example.com")).toBe(false);
  });

  it("detects stale entries", () => {
    const chain = makeChain([
      AccessList.grant({ id: "alice@example.com", expiresAt: "2020-01-01T00:00:00.000Z" }),
      AccessList.grant({ id: "bob@example.com", expiresAt: "2099-01-01T00:00:00.000Z" }),
    ]);
    const list = AccessList.fromChain(chain);
    const stale = list.stale(new Date("2026-01-01"));
    expect(stale.map((e) => e.id)).toEqual(["alice@example.com"]);
  });

  it("re-granting after revoke restores access", () => {
    const chain = makeChain([
      AccessList.grant({ id: "alice@example.com" }),
      AccessList.revoke({ id: "alice@example.com" }),
      AccessList.grant({ id: "alice@example.com" }),
    ]);
    const list = AccessList.fromChain(chain);
    expect(list.isGranted("alice@example.com")).toBe(true);
  });
});
