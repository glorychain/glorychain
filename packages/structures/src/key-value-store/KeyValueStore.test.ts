import type { Chain, GenesisBlock } from "@glorychain/core";
import { describe, expect, it } from "vitest";
import { KeyValueStore } from "./KeyValueStore.js";

function makeChain(events: string[]): Chain {
  const genesis: GenesisBlock = {
    blockNumber: 0,
    chainId: "test-chain",
    content: "Config register",
    timestamp: "2026-01-01T00:00:00.000Z" as never,
    previousHash: null,
    hash: "genesis-hash",
    signature: "sig",
    publicKey: "pubkey",
    protocolVersion: "0.1",
    creatorId: "test",
    purpose: "config",
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

describe("KeyValueStore", () => {
  it("sets and retrieves values", () => {
    const chain = makeChain([
      KeyValueStore.set({ key: "rate_limit", value: "100" }),
      KeyValueStore.set({ key: "feature_x", value: "enabled" }),
    ]);

    const store = KeyValueStore.fromChain(chain);
    expect(store.get("rate_limit")).toBe("100");
    expect(store.get("feature_x")).toBe("enabled");
    expect(store.size).toBe(2);
  });

  it("later SET overwrites earlier value", () => {
    const chain = makeChain([
      KeyValueStore.set({ key: "rate_limit", value: "100" }),
      KeyValueStore.set({ key: "rate_limit", value: "150" }),
    ]);

    const store = KeyValueStore.fromChain(chain);
    expect(store.get("rate_limit")).toBe("150");
    expect(store.size).toBe(1);
  });

  it("DELETE removes a key", () => {
    const chain = makeChain([
      KeyValueStore.set({ key: "rate_limit", value: "100" }),
      KeyValueStore.delete("rate_limit"),
    ]);

    const store = KeyValueStore.fromChain(chain);
    expect(store.has("rate_limit")).toBe(false);
    expect(store.size).toBe(0);
  });

  it("CLEAR removes all keys", () => {
    const chain = makeChain([
      KeyValueStore.set({ key: "a", value: "1" }),
      KeyValueStore.set({ key: "b", value: "2" }),
      KeyValueStore.clear(),
      KeyValueStore.set({ key: "c", value: "3" }),
    ]);

    const store = KeyValueStore.fromChain(chain);
    expect(store.has("a")).toBe(false);
    expect(store.has("b")).toBe(false);
    expect(store.get("c")).toBe("3");
    expect(store.size).toBe(1);
  });

  it("records which block each entry was set at", () => {
    const chain = makeChain([
      KeyValueStore.set({ key: "x", value: "first" }),
      KeyValueStore.set({ key: "x", value: "second" }),
    ]);

    const store = KeyValueStore.fromChain(chain);
    expect(store.getEntry("x")?.setAtBlock).toBe(2);
  });

  it("toObject returns plain record", () => {
    const chain = makeChain([
      KeyValueStore.set({ key: "a", value: "1" }),
      KeyValueStore.set({ key: "b", value: "2" }),
    ]);

    const store = KeyValueStore.fromChain(chain);
    expect(store.toObject()).toEqual({ a: "1", b: "2" });
  });
});
