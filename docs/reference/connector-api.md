# Writing a Connector

A connector is a persistence backend for glorychain. The protocol ships with four connectors: `@glorychain/fs`, `@glorychain/github`, `@glorychain/s3`, and `@glorychain/postgres`. You can write your own for any storage target.

---

## The Connector interface

```ts
import type { Chain, ThreatEvent, VerificationResult } from "@glorychain/core"

interface Connector {
  version: string                                           // connector implementation version
  read(chainId: string): Promise<Chain>
  write(chain: Chain): Promise<void>                        // idempotent — safe to call twice
  watch(chainId: string): AsyncIterable<ThreatEvent>        // never throws — emits errors as ThreatEvent
  migrate(chainId: string, target: Connector): Promise<void>
  verify(chainId: string): Promise<VerificationResult>
}
```

---

## Reference: FsConnector

`@glorychain/fs` stores each chain as a JSON file at `{dir}/{chainId}.json`.

```ts
import { FsConnector } from "@glorychain/fs"

const connector = new FsConnector("./chains")

// Write a chain
await connector.write(chain)

// Read a chain by ID
const chain = await connector.read("550e8400-...")

// List all chain IDs
const ids = await connector.list()
```

---

## Reference: S3Connector

`@glorychain/s3` stores each chain as a JSON object at `{prefix}/{chainId}.json`. Works with AWS S3, Cloudflare R2, and MinIO.

```bash
npm install @glorychain/s3
```

```ts
import { S3Connector } from "@glorychain/s3"

// AWS S3
const connector = new S3Connector({
  bucket: "my-chains",
  region: "us-east-1",
})

// Cloudflare R2 or MinIO (custom endpoint)
const connector = new S3Connector({
  bucket: "my-chains",
  endpoint: "https://my-account.r2.cloudflarestorage.com",
  credentials: { accessKeyId: "...", secretAccessKey: "..." },
})

await connector.write(chain)
const chain = await connector.read(chainId)
const ids = await connector.list()
await connector.delete(chainId)
```

Config options:

| Option | Required | Default | Description |
|---|---|---|---|
| `bucket` | yes | — | S3 bucket name |
| `prefix` | no | `"chains"` | Key prefix — chains stored at `{prefix}/{chainId}.json` |
| `region` | no | `"us-east-1"` | AWS region |
| `endpoint` | no | — | Custom endpoint URL (R2, MinIO) |
| `credentials` | no | — | `{ accessKeyId, secretAccessKey }` — uses AWS SDK credential chain if omitted |

---

## Reference: PgConnector

`@glorychain/postgres` stores chains in a Postgres database. Accepts an existing `pg.Pool` — zero extra connections when embedding in your app.

```bash
npm install @glorychain/postgres
```

```ts
import { Pool } from "pg"
import { PgConnector } from "@glorychain/postgres"

// Pass your existing pool
const connector = new PgConnector({ pool: existingPool })

// Or use a connection string
const connector = new PgConnector({ connectionString: process.env.DATABASE_URL })

// Create tables (idempotent — safe to call on every startup)
await connector.migrate()

await connector.write(chain)
const chain = await connector.read(chainId)
const ids = await connector.list()
await connector.delete(chainId)

// Close the pool — only closes if PgConnector created it
await connector.end()
```

Config options:

| Option | Required | Default | Description |
|---|---|---|---|
| `connectionString` | no¹ | — | Postgres connection string |
| `pool` | no¹ | — | Existing `pg.Pool` — takes precedence over `connectionString` |
| `schema` | no | `"jsonb"` | Storage schema: `"jsonb"` (single table) or `"normalised"` (blocks table) |
| `tablePrefix` | no | `"glorychain"` | Table name prefix — creates `{prefix}_chains` and (if normalised) `{prefix}_blocks` |

¹ One of `connectionString` or `pool` is required.

**JSONB schema** (default): stores the full chain JSON in a single `glorychain_chains` table. Simple and fast.

**Normalised schema**: stores chain metadata in `glorychain_chains` and individual blocks in `glorychain_blocks`. Enables SQL queries directly on block content.

---

## Reference: GitHubConnector

`@glorychain/github` stores chains as JSON files committed to a GitHub repository. Provides tamper detection using GitHub's commit history.

```ts
import { GitHubConnector } from "@glorychain/github"

const connector = new GitHubConnector({
  owner: "my-org",
  repo: "my-chain-repo",
  token: process.env.GITHUB_TOKEN,
})

await connector.write(chain)
const chain = await connector.read(chainId)
```

See the [self-hosted chain guide](../guides/self-hosted-chain.md) for the full GitHub setup.

---

## Chain JSON shape

Connectors store and retrieve the `Chain` type:

```ts
type ChainMetadata = {
  chainId: string
  createdAt: string
  protocolVersion: string
  hashAlgorithm: string
  signatureScheme: string
  migrationHistory: MigrationEvent[]
  knownForks: ForkReference[]
  transferHistory: TransferEvent[]
}

// purpose, creatorId, identityType, and schema live in the genesis block (blocks[0])
type Chain = {
  metadata: ChainMetadata
  blocks: [GenesisBlock, ...Block[]]
}
```

Connectors should store the full `Chain` object as-is and return it without modification. Verification is the protocol's responsibility, not the connector's.

---

## Using your connector with the core API

```ts
import { appendBlock, createChain, verifyChain } from "@glorychain/core"
import { S3Connector } from "./s3-connector"

const connector = new S3Connector("my-chain-bucket")

// Create
const result = createChain({ content: "Genesis", purpose: "audit", ... }, privateKey)
if (result.ok) await connector.write(result.value)

// Append
const chain = await connector.read(chainId)
const appended = appendBlock(chain, { content: "New record", publicKey }, privateKey)
if (appended.ok) await connector.write(appended.value)

// Verify
const chain = await connector.read(chainId)
const verification = await verifyChain(chain)
```
