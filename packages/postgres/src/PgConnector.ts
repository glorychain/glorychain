import type { Chain, Connector, ThreatEvent, VerificationResult } from "@glorychain/core";
import { migrateChain, verifyChain } from "@glorychain/core";
import { Pool } from "pg";

export type PgSchema = "jsonb" | "normalised";

export interface PgConnectorConfig {
  /** Postgres connection string. Ignored if pool is provided. */
  connectionString?: string;
  /** Pass an existing pg Pool — zero extra connections when embedding in an app. */
  pool?: Pool;
  /** Storage schema. Default: "jsonb" */
  schema?: PgSchema;
  /** Table name prefix. Default: "glorychain" */
  tablePrefix?: string;
}

export class PgConnector implements Connector {
  readonly version = "0.0.1";

  private readonly pool: Pool;
  private readonly schema: PgSchema;
  private readonly chainsTable: string;
  private readonly blocksTable: string;
  private readonly ownPool: boolean;

  constructor(config: PgConnectorConfig) {
    this.schema = config.schema ?? "jsonb";
    const prefix = config.tablePrefix ?? "glorychain";
    this.chainsTable = `${prefix}_chains`;
    this.blocksTable = `${prefix}_blocks`;

    if (config.pool) {
      this.pool = config.pool;
      this.ownPool = false;
    } else {
      this.pool = new Pool({ connectionString: config.connectionString });
      this.ownPool = true;
    }
  }

  /**
   * Create the required tables if they don't exist. Idempotent — safe to call on startup.
   */
  async migrate(): Promise<void> {
    if (this.schema === "jsonb") {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.chainsTable} (
          chain_id   TEXT PRIMARY KEY,
          chain      JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT now()
        )
      `);
    } else {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.chainsTable} (
          chain_id   TEXT PRIMARY KEY,
          purpose    TEXT,
          creator_id TEXT,
          created_at TIMESTAMPTZ
        );
        CREATE TABLE IF NOT EXISTS ${this.blocksTable} (
          chain_id      TEXT REFERENCES ${this.chainsTable}(chain_id) ON DELETE CASCADE,
          block_number  INTEGER,
          content       TEXT NOT NULL,
          hash          TEXT NOT NULL,
          previous_hash TEXT,
          signature     TEXT NOT NULL,
          public_key    TEXT NOT NULL,
          timestamp     TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (chain_id, block_number)
        )
      `);
    }
  }

  async read(chainId: string): Promise<Chain> {
    if (this.schema === "jsonb") {
      const result = await this.pool.query(
        `SELECT chain FROM ${this.chainsTable} WHERE chain_id = $1`,
        [chainId],
      );
      if (result.rows.length === 0) throw new Error(`Chain not found: ${chainId}`);
      return result.rows[0].chain as Chain;
    }

    // Normalised: reconstruct Chain from blocks table
    const chainResult = await this.pool.query(
      `SELECT * FROM ${this.chainsTable} WHERE chain_id = $1`,
      [chainId],
    );
    if (chainResult.rows.length === 0) throw new Error(`Chain not found: ${chainId}`);

    const blocksResult = await this.pool.query(
      `SELECT * FROM ${this.blocksTable} WHERE chain_id = $1 ORDER BY block_number ASC`,
      [chainId],
    );

    const blocks = blocksResult.rows.map((row) => JSON.parse(row.content as string));
    return { blocks } as Chain;
  }

  async write(chain: Chain): Promise<void> {
    const chainId = chain.metadata.chainId;

    if (this.schema === "jsonb") {
      await this.pool.query(
        `INSERT INTO ${this.chainsTable} (chain_id, chain, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (chain_id) DO UPDATE SET chain = $2, updated_at = now()`,
        [chainId, JSON.stringify(chain)],
      );
      return;
    }

    // Normalised: upsert chain row, then batch INSERT all blocks
    const genesis = chain.blocks[0];
    await this.pool.query(
      `INSERT INTO ${this.chainsTable} (chain_id, purpose, creator_id, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (chain_id) DO NOTHING`,
      [
        chainId,
        (genesis as { purpose?: string }).purpose ?? null,
        (genesis as { creatorId?: string }).creatorId ?? null,
        genesis.timestamp,
      ],
    );

    if (chain.blocks.length === 0) return;

    // Batch INSERT — one round trip regardless of chain length
    const cols = 8;
    const values: unknown[] = [];
    const placeholders: string[] = [];
    chain.blocks.forEach((block, i) => {
      const base = i * cols;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`,
      );
      values.push(
        chainId,
        block.blockNumber,
        JSON.stringify(block),
        block.hash,
        block.previousHash,
        block.signature,
        block.publicKey,
        block.timestamp,
      );
    });

    await this.pool.query(
      `INSERT INTO ${this.blocksTable}
         (chain_id, block_number, content, hash, previous_hash, signature, public_key, timestamp)
       VALUES ${placeholders.join(", ")}
       ON CONFLICT (chain_id, block_number) DO NOTHING`,
      values,
    );
  }

  async exists(chainId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM ${this.chainsTable} WHERE chain_id = $1`,
      [chainId],
    );
    return result.rows.length > 0;
  }

  async list(): Promise<string[]> {
    const result = await this.pool.query(`SELECT chain_id FROM ${this.chainsTable}`);
    return result.rows.map((row) => row.chain_id as string);
  }

  async delete(chainId: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.chainsTable} WHERE chain_id = $1`, [chainId]);
  }

  async migrate_chain(chainId: string, target: Connector): Promise<void> {
    const chain = await this.read(chainId);
    const updated = migrateChain(chain, "postgres", target.version);
    await target.write(updated);
  }

  async verify(chainId: string): Promise<VerificationResult> {
    const chain = await this.read(chainId);
    return verifyChain(chain);
  }

  watch(_chainId: string): AsyncIterable<ThreatEvent> {
    throw new Error(
      "PgConnector does not support watch(). Use LISTEN/NOTIFY or poll verify() instead.",
    );
  }

  /** Close the pool. Only closes if PgConnector created it — not if you passed your own. */
  async end(): Promise<void> {
    if (this.ownPool) await this.pool.end();
  }
}
