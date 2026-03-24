# AGENTS.md

glorychain is an open protocol for verifiable institutional truth — tamper-evident, cryptographically signed chains of records. Ed25519 signing, SHA-256 hash chaining, append-only. The platform is a notary, not a judge.

## Dev environment

- **Prerequisites:** Node 18+, pnpm 10+
- **Install:** `pnpm install`
- **Build:** `pnpm build`
- **Test:** `pnpm test`
- **Lint:** `pnpm lint`
- **Typecheck:** `pnpm typecheck`
- **Format:** `pnpm format`

Single package:
```bash
pnpm --filter @glorychain/core build
pnpm --filter @glorychain/core test
```

## Monorepo structure

```
packages/core        @glorychain/core       — protocol (createChain, appendBlock, verifyChain, forkChain)
packages/shared      @glorychain/shared     — Zod validators + shared types
packages/fs          @glorychain/fs         — filesystem connector
packages/github      @glorychain/github     — GitHub connector + tamper detection
packages/structures  @glorychain/structures — OrgTree, KeyValueStore, MemberSet
apps/cli             glorychain             — CLI (11 commands)
apps/conformance                            — protocol compliance test suite
```

## Code style

- TypeScript strict mode + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
- Biome for linting and formatting — line width 100, 2-space indent, double quotes, trailing commas
- ESM only (`"type": "module"`)
- Never throw for expected errors — return `Result<T, E>` discriminated union
- All fallible operations: check `result.ok` before accessing `result.value`
- No `console.log` in source (Biome enforces this outside test files)

## Key concepts

- **Chain** — ordered sequence of signed, hash-linked blocks; stored as JSON
- **Block** — content (string) + timestamp + Ed25519 signature + SHA-256 hash of previous block
- **Genesis block (block 0)** — first block; contains chain metadata and optional JSON Schema v7 for content validation
- **Connector** — pluggable storage backend implementing `read / write / list`
- **Structure** — stateful view derived by replaying blocks through a pure reducer (OrgTree, KeyValueStore, MemberSet)
- **Fork** — new chain branching from existing one; carries provenance reference

## Core API

```ts
import { createChain, appendBlock, verifyChain, generateKeypair, forkChain } from "@glorychain/core"
import { FsConnector } from "@glorychain/fs"

const kp = generateKeypair()
// kp.value = { publicKey: string, privateKey: string } (base64url Ed25519)

const chain = createChain({ content, purpose, creatorId, identityType, publicKey, schema? }, privateKey)
// Returns Result<Chain>

const updated = appendBlock(chain, { content, publicKey }, privateKey)
// Returns Result<Chain>

const result = await verifyChain(chain)
// result.valid: boolean, result.errors: VerificationError[], result.blockCount: number

const connector = new FsConnector("./chains")
await connector.write(chain)
const chain = await connector.read(chainId)
```

## Structures API

```ts
import { OrgTree, KeyValueStore, MemberSet } from "@glorychain/structures"

// OrgTree — org hierarchy
const tree = OrgTree.fromChain(chain)
tree.get(id)                  // OrgMember | undefined
tree.directReports(id)        // OrgMember[]
tree.subtree(id)              // recursive reports
tree.pathTo(id)               // root → member path
tree.headcount                // active count

// Event builders → block content strings
OrgTree.appoint({ id, name, role, reportsTo })
OrgTree.depart({ id, reason?, handoverTo? })
OrgTree.promote({ id, role, reportsTo? })
OrgTree.transfer({ id, reportsTo })
OrgTree.rename({ id, role })
OrgTree.suspend({ id }) / OrgTree.reinstate({ id })

// KeyValueStore — config register
const store = KeyValueStore.fromChain(chain)
store.get(key) / store.has(key) / store.toObject()
KeyValueStore.set({ key, value, metadata? }) / KeyValueStore.delete(key) / KeyValueStore.clear()

// MemberSet — membership list
const set = MemberSet.fromChain(chain)
set.active / set.current / set.byRole(role)
MemberSet.join({ id, name, role? }) / MemberSet.leave({ id }) / MemberSet.roleChange({ id, role })

// Pass genesisSchema to createChain to enforce block structure at the protocol level
createChain({ ..., schema: OrgTree.genesisSchema }, privateKey)
```

## Chain JSON shape

```json
{
  "metadata": {
    "chainId": "uuid",
    "purpose": "string",
    "creatorId": "string",
    "identityType": "anonymous | github | did",
    "createdAt": "ISO8601",
    "protocolVersion": "0.1",
    "schema": {}
  },
  "blocks": [
    {
      "blockNumber": 0,
      "chainId": "uuid",
      "content": "string",
      "timestamp": "ISO8601",
      "previousHash": null,
      "hash": "hex",
      "signature": "base64url",
      "publicKey": "base64url",
      "protocolVersion": "0.1"
    }
  ]
}
```

## Testing instructions

- Run all tests: `pnpm test`
- Run single package: `pnpm --filter @glorychain/core test`
- Run conformance suite: `node apps/conformance/dist/index.mjs run`
- All tests must pass before opening a PR
- Protocol or core changes must pass the full conformance suite

## PR instructions

- Fill in the PR template checklist
- Add a changeset for any public API changes: `pnpm changeset`
- Title: short and descriptive (under 70 chars)
- Protocol changes require an issue first (use the Protocol extension proposal template)

## Verification rules

A chain is valid when: all block hashes match canonical payloads, all signatures verify, block numbers are contiguous from 0, each `previousHash` matches the prior block's hash, no timestamps are in the future, and all content conforms to the genesis schema (if defined).

## Full documentation

- [Why glorychain](docs/why-glorychain.md)
- [Quickstart](docs/quickstart.md)
- [Use cases](docs/use-cases.md)
- [Structures guide](docs/guides/structures.md)
- [Programmatic API](docs/guides/programmatic-api.md)
- [Protocol spec](docs/reference/protocol-spec.md)
- [CLI reference](docs/reference/cli-reference.md)
- [Connector API](docs/reference/connector-api.md)
- [Schema validation](docs/guides/schema-validation.md)
- [Forking](docs/guides/forking.md)
- [Error codes](docs/reference/error-codes.md)
- [Roadmap](ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
