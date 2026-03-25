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
packages/s3          @glorychain/s3         — S3/R2/MinIO connector
packages/postgres    @glorychain/postgres   — Postgres connector (JSONB or normalised schema)
packages/structures  @glorychain/structures — OrgTree, KeyValueStore, MemberSet, VoteRegister, DecisionLog, Timeline, DocumentRegister, AccessList, ChangeLog
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

All 9 structures follow the same pattern: `Structure.fromChain(chain)` → state, static event builders → block content strings, `Structure.genesisSchema` → pass to `createChain` to enforce block structure.

```ts
import {
  AccessList, ChangeLog, DecisionLog, DocumentRegister,
  KeyValueStore, MemberSet, OrgTree, Timeline, VoteRegister,
} from "@glorychain/structures"

// OrgTree — org hierarchy
const tree = OrgTree.fromChain(chain)
tree.get(id) / tree.directReports(id) / tree.subtree(id) / tree.headcount
OrgTree.appoint({ id, name, role, reportsTo }) / OrgTree.depart({ id }) / OrgTree.promote({ id, role })

// KeyValueStore — config register
const store = KeyValueStore.fromChain(chain)
store.get(key) / store.toObject()
KeyValueStore.set({ key, value }) / KeyValueStore.delete(key) / KeyValueStore.clear()

// MemberSet — membership list
const set = MemberSet.fromChain(chain)
set.active / set.current / set.byRole(role)
MemberSet.join({ id, name, role? }) / MemberSet.leave({ id }) / MemberSet.roleChange({ id, role })

// VoteRegister — motion and vote record
const register = VoteRegister.fromChain(chain)
register.tally(id) / register.open / register.passed / register.withdrawn
VoteRegister.motion({ id, title, proposedBy }) / VoteRegister.cast({ motionId, voterId, vote }) / VoteRegister.close({ id, outcome })

// DecisionLog — tamper-evident decision record
const log = DecisionLog.fromChain(chain)
log.active / log.superseded / log.lineage(id)
DecisionLog.record({ id, title, body, decidedBy }) / DecisionLog.supersede({ id, supersedes, ... }) / DecisionLog.withdraw({ id })

// Timeline — chronological event log
const timeline = Timeline.fromChain(chain)
timeline.active / timeline.byTag(tag) / timeline.tags
Timeline.entry({ id, title, body, tags? }) / Timeline.retract({ id })

// DocumentRegister — version-tracked document registry
const docs = DocumentRegister.fromChain(chain)
docs.current / docs.byHash(hash)
DocumentRegister.publish({ id, title, hash, version }) / DocumentRegister.supersede({ id, supersedes, ... }) / DocumentRegister.withdraw({ id })

// AccessList — permission register
const access = AccessList.fromChain(chain)
access.isGranted(id) / access.granted / access.stale()
AccessList.grant({ id, resource, grantedBy, expiresAt? }) / AccessList.revoke({ id, revokedBy }) / AccessList.expire({ id })

// ChangeLog — software release register
const changelog = ChangeLog.fromChain(chain)
changelog.latest / changelog.active / changelog.yanked / changelog.breaking
ChangeLog.release({ version, notes, breaking? }) / ChangeLog.deprecate({ version }) / ChangeLog.yank({ version })

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
