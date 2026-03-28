# Embedding glorychain in your application

This guide is for engineers adding glorychain to an existing production application — a B2B SaaS, an internal tool, a compliance layer.

The goal: every significant event in your system becomes a cryptographically signed, independently verifiable block. Your enterprise customers can verify your audit trail themselves. No trust required.

---

## The pattern

You add three things to your existing app:

1. A glorychain connector pointed at your existing database
2. Event appends at the points where things happen (deploys, config changes, approvals)
3. A verification endpoint your customers can call — or a public URL they can check themselves

Your users never see glorychain. It runs underneath.

---

## Installation

```bash
npm install @glorychain/core @glorychain/postgres @glorychain/structures
```

---

## Step 1 — Wire up the connector

Pass your existing `pg.Pool` — no extra database connections.

```ts
// lib/chain.ts
import { Pool } from "pg"
import { PgConnector } from "@glorychain/postgres"

// Your app's existing pool
export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const connector = new PgConnector({ pool })
```

Call `migrate()` once on startup — idempotent, safe to run every time:

```ts
// server.ts
import { connector } from "./lib/chain.js"

await connector.migrate()
```

This creates two tables: `glorychain_chains` and (if using normalised schema) `glorychain_blocks`.

---

## Step 2 — Store your keypair

Generate once, store in your secrets manager:

```bash
glorychain keygen
```

```ts
// lib/chain.ts
export const PUBLIC_KEY  = process.env.CHAIN_PUBLIC_KEY!
export const PRIVATE_KEY = process.env.CHAIN_PRIVATE_KEY!
```

Never commit the private key. Rotate it via `glorychain fork` if it's ever compromised.

---

## Step 3 — Create your chain

One chain per audit domain. Run this once in a migration or setup script:

```ts
import { createChain } from "@glorychain/core"
import { KeyValueStore } from "@glorychain/structures"
import { connector, PRIVATE_KEY, PUBLIC_KEY } from "./lib/chain.js"

const result = createChain(
  {
    content: "Payments API audit trail. All deploys and config changes appended by CI.",
    purpose: "audit-log",
    creatorId: "deploy-bot@company.com",
    identityType: "anonymous",
    publicKey: PUBLIC_KEY,
    contentSchema: KeyValueStore.genesisSchema,
  },
  PRIVATE_KEY,
)

if (!result.ok) throw new Error(result.error.message)

await connector.write(result.value)

console.log("Chain created:", result.value.metadata.chainId)
// Store this ID — you'll need it to append and read
```

---

## Step 4 — Append events

Call this wherever something significant happens. It's a fire-and-forget write — add it after your existing logic.

```ts
// lib/audit.ts
import { appendBlock } from "@glorychain/core"
import { KeyValueStore } from "@glorychain/structures"
import { connector, PRIVATE_KEY, PUBLIC_KEY } from "./chain.js"

const CHAIN_ID = process.env.AUDIT_CHAIN_ID!

export async function auditConfigChange(
  key: string,
  oldValue: string,
  newValue: string,
  approvedBy: string,
): Promise<void> {
  const chain = await connector.read(CHAIN_ID)

  const result = appendBlock(
    chain,
    {
      content: KeyValueStore.set({
        key,
        value: newValue,
        metadata: { approvedBy, previous: oldValue },
      }),
      publicKey: PUBLIC_KEY,
    },
    PRIVATE_KEY,
  )

  if (!result.ok) throw new Error(result.error.message)
  await connector.write(result.value)
}

export async function auditDeploy(
  version: string,
  sha: string,
  triggeredBy: string,
): Promise<void> {
  const chain = await connector.read(CHAIN_ID)

  const result = appendBlock(
    chain,
    {
      content: `DEPLOY ${version} — SHA: ${sha} — triggered by: ${triggeredBy}`,
      publicKey: PUBLIC_KEY,
    },
    PRIVATE_KEY,
  )

  if (!result.ok) throw new Error(result.error.message)
  await connector.write(result.value)
}
```

Wire into your existing handlers:

```ts
// routes/config.ts
import { auditConfigChange } from "../lib/audit.js"

app.post("/config/:key", async (req, res) => {
  const { key } = req.params
  const { value } = req.body
  const old = await getConfig(key)

  await setConfig(key, value)

  // Append to chain — non-blocking to your response time
  auditConfigChange(key, old, value, req.user.email).catch(console.error)

  res.json({ ok: true })
})
```

---

## Step 5 — Query current state

Use `KeyValueStore.fromChain()` to derive current state from the chain:

```ts
import { KeyValueStore } from "@glorychain/structures"

const chain = await connector.read(CHAIN_ID)
const store = KeyValueStore.fromChain(chain)

store.get("rate_limit_multiplier")        // "1.5"
store.getEntry("rate_limit_multiplier")   // { value, setAtBlock, metadata }
store.toObject()                          // full current config as plain object
```

---

## Step 6 — Expose a verification endpoint

This is the feature that wins enterprise deals. Give your customers a URL they can hit to verify your audit trail independently.

```ts
// routes/verify.ts
import { verifyChain } from "@glorychain/core"
import { connector } from "../lib/chain.js"

const CHAIN_ID = process.env.AUDIT_CHAIN_ID!

app.get("/audit/verify", async (req, res) => {
  const chain = await connector.read(CHAIN_ID)
  const result = await verifyChain(chain)

  res.json({
    valid: result.valid,
    blockCount: result.blockCount,
    chainId: CHAIN_ID,
    checkedAt: new Date().toISOString(),
    ...(result.valid ? {} : { errors: result.errors }),
  })
})

// Public chain export — customers can download and verify locally
app.get("/audit/chain", async (req, res) => {
  const chain = await connector.read(CHAIN_ID)
  res.json(chain)
})
```

Your customer downloads the exported JSON and verifies locally:

```bash
glorychain verify --chain <chainId> --dir ./downloaded-chains
```

No dependency on your infrastructure — verification is fully self-contained.

---

## Using OrgTree for personnel records

If your product tracks team membership or reporting structure, `OrgTree` gives you a tamper-evident org chart:

```ts
import { OrgTree } from "@glorychain/structures"
import { appendBlock } from "@glorychain/core"

// When someone is hired
await appendBlock(chain, {
  content: OrgTree.appoint({
    id: employee.email,
    name: employee.name,
    role: employee.title,
    reportsTo: employee.managerId,
  }),
  publicKey: PUBLIC_KEY,
}, PRIVATE_KEY)

// Query current state
const tree = OrgTree.fromChain(chain)
tree.get("sarah@company.com")          // OrgMember
tree.directReports("sarah@company.com") // OrgMember[]
tree.headcount                          // number
```

Enterprise compliance buyers ask: *"Can you prove when this person was hired and who they reported to?"* The chain answers that question without a support ticket.

---

## Using VoteRegister for approval workflows

If your product has approval flows — budget approvals, policy sign-offs, release gates — `VoteRegister` makes them auditable:

```ts
import { VoteRegister } from "@glorychain/structures"

// When a deployment needs approval
await appendBlock(chain, {
  content: VoteRegister.motion({
    id: `deploy-${sha}`,
    title: `Deploy v${version} to production`,
    proposedBy: requester,
  }),
  publicKey: PUBLIC_KEY,
}, PRIVATE_KEY)

// When someone approves
await appendBlock(chain, {
  content: VoteRegister.cast({
    motionId: `deploy-${sha}`,
    voterId: approver,
    vote: "yes",
  }),
  publicKey: PUBLIC_KEY,
}, PRIVATE_KEY)

// Query
const register = VoteRegister.fromChain(chain)
register.tally(`deploy-${sha}`)   // { yes: 2, no: 0, abstain: 0, total: 2 }
```

---

## Multiple chains

You don't have to put everything in one chain. One chain per domain is cleaner:

```ts
const CHAINS = {
  config:    process.env.CONFIG_CHAIN_ID!,
  deploys:   process.env.DEPLOY_CHAIN_ID!,
  approvals: process.env.APPROVAL_CHAIN_ID!,
  personnel: process.env.PERSONNEL_CHAIN_ID!,
}
```

Each chain has its own purpose, its own schema, and its own verification URL.

---

## Performance notes

- `appendBlock` is synchronous (CPU) — the async work is `connector.write()`
- `fromChain()` replays all blocks on every call — for high-frequency reads, cache the result or use the normalised Postgres schema to query blocks directly
- Chains are designed for audit logs, not hot write paths — if you're appending more than a few times per second, consider batching

---

## Further reading

- [Programmatic API](programmatic-api.md) — core API reference
- [Structures guide](structures.md) — all available structures
- [Connector API](../reference/connector-api.md) — write your own connector
- [`@glorychain/postgres` README](../../packages/postgres/README.md) — Postgres connector config
- [`@glorychain/s3` README](../../packages/s3/README.md) — S3 connector config
