import type { Chain, GenesisBlock } from "@glorychain/core";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PgConnector } from "./PgConnector.js";

// Integration test — requires a real Postgres instance.
// Set TEST_DATABASE_URL to run. Skipped otherwise.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const runIntegration = !!TEST_DATABASE_URL;

function makeChain(id: string): Chain {
  const genesis: GenesisBlock = {
    blockNumber: 0,
    chainId: id,
    content: "Test chain",
    timestamp: "2026-01-01T00:00:00.000Z" as never,
    previousHash: null,
    hash: `genesis-hash-${id}`,
    signature: "sig",
    publicKey: "pubkey",
    protocolVersion: "0.1",
    creatorId: "test",
    purpose: "test",
    identityType: "anonymous",
    hashAlgorithm: "sha256",
    signatureScheme: "ed25519",
  };
  return {
    blocks: [genesis],
    metadata: { chainId: id },
  } as unknown as Chain;
}

describe.skipIf(!runIntegration)("PgConnector (integration)", () => {
  let pool: Pool;
  let connector: PgConnector;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DATABASE_URL });
    connector = new PgConnector({ pool, tablePrefix: "test_glorychain" });
    await connector.migrate();
  });

  afterAll(async () => {
    await pool.query("DROP TABLE IF EXISTS test_glorychain_blocks");
    await pool.query("DROP TABLE IF EXISTS test_glorychain_chains");
    await pool.end();
  });

  it("writes and reads a chain (jsonb)", async () => {
    const chain = makeChain("pg-chain-001");
    await connector.write(chain);
    const read = await connector.read("pg-chain-001");
    expect(read.metadata.chainId).toBe("pg-chain-001");
  });

  it("exists returns true after write", async () => {
    const chain = makeChain("pg-chain-002");
    await connector.write(chain);
    expect(await connector.exists("pg-chain-002")).toBe(true);
  });

  it("exists returns false for unknown chain", async () => {
    expect(await connector.exists("does-not-exist")).toBe(false);
  });

  it("list returns written chain ids", async () => {
    await connector.write(makeChain("pg-list-a"));
    await connector.write(makeChain("pg-list-b"));
    const ids = await connector.list();
    expect(ids).toContain("pg-list-a");
    expect(ids).toContain("pg-list-b");
  });

  it("delete removes a chain", async () => {
    await connector.write(makeChain("pg-del-chain"));
    await connector.delete("pg-del-chain");
    expect(await connector.exists("pg-del-chain")).toBe(false);
  });

  it("upsert overwrites existing chain", async () => {
    const chain = makeChain("pg-upsert");
    await connector.write(chain);
    await connector.write(chain); // should not throw
    expect(await connector.exists("pg-upsert")).toBe(true);
  });
});

describe("PgConnector (unit — config)", () => {
  it("accepts a connectionString", () => {
    expect(() => new PgConnector({ connectionString: "postgres://localhost/test" })).not.toThrow();
  });

  it("accepts an existing pool", () => {
    const pool = new Pool({ connectionString: "postgres://localhost/test" });
    expect(() => new PgConnector({ pool })).not.toThrow();
    // Don't end the pool — it was never connected
  });
});
