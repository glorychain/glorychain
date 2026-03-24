# @glorychain/postgres

> PostgreSQL connector for glorychain. Store chains in Postgres, Supabase, Neon, or Railway.

```bash
npm install @glorychain/postgres
# or
pnpm add @glorychain/postgres
```

---

## Usage

### Standalone

```ts
import { createChain, generateKeypair } from "@glorychain/core"
import { PgConnector } from "@glorychain/postgres"

const connector = new PgConnector({
  connectionString: process.env.DATABASE_URL,
})

await connector.migrate() // create tables if they don't exist

const { value: { privateKey, publicKey } } = generateKeypair()

const { value: chain } = createChain({
  content: "Deployment audit trail.",
  purpose: "devops",
  creatorId: "deploy-bot@company.com",
  identityType: "anonymous",
  publicKey,
}, privateKey)

await connector.write(chain)
const read = await connector.read(chain.metadata.chainId)
```

### Embedded in an existing app

Pass your existing `pg.Pool` — zero extra connections:

```ts
import { Pool } from "pg"
import { PgConnector } from "@glorychain/postgres"

// Your app's existing pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const connector = new PgConnector({ pool })
await connector.migrate()
```

---

## Schema options

### JSONB (default — recommended)

Chains stored as a single JSONB column. Simple, fast, no joins.

```sql
CREATE TABLE glorychain_chains (
  chain_id   TEXT PRIMARY KEY,
  chain      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Normalised

Blocks stored in a separate table, enabling SQL queries directly on block data.

```sql
CREATE TABLE glorychain_chains (
  chain_id   TEXT PRIMARY KEY,
  purpose    TEXT,
  creator_id TEXT,
  created_at TIMESTAMPTZ
);

CREATE TABLE glorychain_blocks (
  chain_id      TEXT REFERENCES glorychain_chains(chain_id) ON DELETE CASCADE,
  block_number  INTEGER,
  content       TEXT NOT NULL,
  hash          TEXT NOT NULL,
  previous_hash TEXT,
  signature     TEXT NOT NULL,
  public_key    TEXT NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (chain_id, block_number)
);
```

```ts
const connector = new PgConnector({
  connectionString: process.env.DATABASE_URL,
  schema: "normalised",
})
```

---

## Config

| Option | Type | Default | Description |
|---|---|---|---|
| `connectionString` | `string` | — | Postgres connection URL. Ignored if `pool` is provided |
| `pool` | `Pool` | — | Existing `pg.Pool` — recommended when embedding in an app |
| `schema` | `"jsonb" \| "normalised"` | `"jsonb"` | Storage schema |
| `tablePrefix` | `string` | `"glorychain"` | Prefix for created tables |

---

## API

| Method | Description |
|---|---|
| `migrate()` | Create tables if they don't exist. Idempotent — safe to call on every startup |
| `read(chainId)` | Read a chain |
| `write(chain)` | Write (upsert) a chain |
| `exists(chainId)` | Check if a chain exists |
| `list()` | List all chain IDs |
| `delete(chainId)` | Delete a chain |
| `verify(chainId)` | Read and verify chain integrity |
| `end()` | Close the pool (only if PgConnector created it) |

`watch()` is not supported — use Postgres `LISTEN`/`NOTIFY` or poll `verify()` instead.

---

## Supabase

```ts
const connector = new PgConnector({
  connectionString: process.env.SUPABASE_DB_URL, // from Project Settings → Database
})
await connector.migrate()
```

## Neon

```ts
const connector = new PgConnector({
  connectionString: process.env.NEON_DATABASE_URL,
})
await connector.migrate()
```
