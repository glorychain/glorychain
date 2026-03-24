# Programmatic API

Using `@glorychain/core` directly in your application.

```bash
npm install @glorychain/core @glorychain/fs
```

---

## Generate a keypair

```ts
import { generateKeypair } from "@glorychain/core"

const result = generateKeypair()
if (!result.ok) throw new Error(result.error.message)

const { publicKey, privateKey } = result.value
// Store privateKey securely — it cannot be recovered
```

---

## Create a chain

```ts
import { createChain } from "@glorychain/core"
import { FsConnector } from "@glorychain/fs"

const connector = new FsConnector("./chains")

const result = createChain(
  {
    content: "Board decision register for Acme Aid.",
    purpose: "NGO governance",
    creatorId: "board.chair@acme-aid.org",
    identityType: "anonymous",
    publicKey,
  },
  privateKey,
)

if (!result.ok) throw new Error(result.error.message)

await connector.write(result.value)
const chainId = result.value.metadata.chainId
```

---

## Append a block

```ts
import { appendBlock } from "@glorychain/core"

const chain = await connector.read(chainId)

const result = appendBlock(
  chain,
  {
    content: "RESOLUTION 2026-001: Budget approved. Unanimous (9/9).",
    publicKey,
  },
  privateKey,
)

if (!result.ok) throw new Error(result.error.message)

await connector.write(result.value)
```

---

## Verify a chain

```ts
import { verifyChain } from "@glorychain/core"

const chain = await connector.read(chainId)
const result = await verifyChain(chain)

if (result.valid) {
  console.log(`Verified — ${result.blockCount} blocks intact`)
} else {
  for (const error of result.errors) {
    console.error(`Block ${error.blockNumber}: ${error.message}`)
  }
}
```

---

## Use the GitHub connector

```ts
import { GitHubConnector } from "@glorychain/github"

const connector = new GitHubConnector({
  owner: "your-org",
  repo: "your-repo",
  token: process.env.GITHUB_TOKEN, // optional — for private repos or write access
})

// Read
const chain = await connector.read(chainId)

// Write (requires token with repo write access)
await connector.write(updatedChain)

// List all chains in the repo
const ids = await connector.list()
```

---

## All exports

```ts
import {
  // Chain lifecycle
  createChain,
  appendBlock,
  verifyChain,
  verifyBlock,
  inspectBlock,

  // Keypair
  generateKeypair,

  // Fork
  forkChain,

  // Types
  type Chain,
  type Block,
  type GenesisMetadata,
  type VerificationResult,
  type VerificationError,
} from "@glorychain/core"
```

---

## Result type pattern

All fallible operations return a `Result` type:

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
```

Always check `result.ok` before accessing `result.value`.

---

## Further reading

- [Connector API](../reference/connector-api.md) — write your own storage backend
- [Schema validation](schema-validation.md) — enforce content structure
- [Forking](forking.md) — handle key compromise and governance changes
