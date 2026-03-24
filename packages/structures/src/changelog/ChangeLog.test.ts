import type { Chain, GenesisBlock } from "@glorychain/core";
import { describe, expect, it } from "vitest";
import { ChangeLog } from "./ChangeLog.js";

function makeChain(events: string[]): Chain {
  const genesis: GenesisBlock = {
    blockNumber: 0,
    chainId: "test-chain",
    content: "Package changelog",
    timestamp: "2026-01-01T00:00:00.000Z" as never,
    previousHash: null,
    hash: "genesis-hash",
    signature: "sig",
    publicKey: "pubkey",
    protocolVersion: "0.1",
    creatorId: "test",
    purpose: "changelog",
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

describe("ChangeLog", () => {
  it("records releases", () => {
    const chain = makeChain([
      ChangeLog.release({ version: "1.0.0", notes: "Initial release." }),
      ChangeLog.release({ version: "1.1.0", notes: "Added feature X." }),
    ]);
    const log = ChangeLog.fromChain(chain);
    expect(log.all).toHaveLength(2);
    expect(log.get("1.0.0")?.status).toBe("active");
  });

  it("latest returns most recent active release", () => {
    const chain = makeChain([
      ChangeLog.release({ version: "1.0.0" }),
      ChangeLog.release({ version: "1.1.0" }),
      ChangeLog.release({ version: "2.0.0", breaking: true }),
    ]);
    const log = ChangeLog.fromChain(chain);
    expect(log.latest?.version).toBe("2.0.0");
  });

  it("deprecates a release", () => {
    const chain = makeChain([
      ChangeLog.release({ version: "1.0.0" }),
      ChangeLog.release({ version: "2.0.0" }),
      ChangeLog.deprecate({ version: "1.0.0", successor: "2.0.0" }),
    ]);
    const log = ChangeLog.fromChain(chain);
    expect(log.get("1.0.0")?.status).toBe("deprecated");
    expect(log.get("1.0.0")?.successor).toBe("2.0.0");
    expect(log.active).toHaveLength(1);
  });

  it("yanks a release", () => {
    const chain = makeChain([
      ChangeLog.release({ version: "1.0.1" }),
      ChangeLog.yank({ version: "1.0.1", reason: "Critical security vulnerability." }),
    ]);
    const log = ChangeLog.fromChain(chain);
    expect(log.get("1.0.1")?.status).toBe("yanked");
    expect(log.get("1.0.1")?.yankReason).toBe("Critical security vulnerability.");
    expect(log.active).toHaveLength(0);
  });

  it("tracks breaking releases", () => {
    const chain = makeChain([
      ChangeLog.release({ version: "1.0.0" }),
      ChangeLog.release({ version: "2.0.0", breaking: true }),
      ChangeLog.release({ version: "3.0.0", breaking: true }),
    ]);
    const log = ChangeLog.fromChain(chain);
    expect(log.breaking).toHaveLength(2);
  });
});
