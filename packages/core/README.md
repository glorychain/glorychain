# @glorychain/core

> The glorychain protocol library. Pure computation, no I/O, zero runtime dependencies.

This is the foundation everything else builds on. Chain lifecycle, cryptographic operations, block construction, integrity verification, and Atom feed generation — all as pure functions that return typed Results.

```bash
npm install @glorychain/core
# or
pnpm add @glorychain/core
```

---

## Design principles

**Zero runtime dependencies.** The entire library is pure ESM computation. No network calls, no file I/O, no Node built-ins. It runs identically in Node 18+, modern browsers, and Deno.

**No thrown errors.** Every operation returns `Result<T, GloryChainError>`. Errors are values — callers handle them explicitly. No surprises.

**Stable, versioned API contract.** The public API surface is the spec. Breaking changes are semver-major. Connectors and downstream packages can build against it with confidence.

**≤50KB bundle, fully tree-shakeable.** No barrel exports that import everything. Import only what you use.

---

## Cryptography

Glory Chain uses **Ed25519** for signing — fast, small, and well-audited. Keys are SPKI/PKCS8 DER, base64url encoded. Block content is hashed with **SHA-256**, chained via `previousHash`.

```typescript
import { generateKeypair } from "@glorychain/core";

const result = generateKeypair();
if (!result.ok) throw result.error;

const { publicKey, privateKey } = result.value;
// publicKey  — base64url SPKI DER, safe to publish
// privateKey — base64url PKCS8 DER, keep secret
```

> **Custody warning:** Private key material is sensitive. Always display `CUSTODY_WARNING` before showing keys to users:
>
> ```typescript
> import { CUSTODY_WARNING } from "@glorychain/core";
> console.warn(CUSTODY_WARNING);
> ```

---

## Chain lifecycle

### `createChain`

```typescript
import { createChain } from "@glorychain/core";

const result = createChain(
  {
    content:      "Public tamper-evident record of all board-level decisions",
    purpose:      "Governance",
    creatorId:    "user-123",
    identityType: "oauth",
    publicKey,
  },
  privateKey,
);

if (!result.ok) throw result.error;
const chain = result.value;
// chain.metadata.chainId  — UUID, stable forever
// chain.blocks[0]         — genesis block, signed with your key
```

### `appendBlock`

```typescript
import { appendBlock } from "@glorychain/core";

const result = appendBlock(
  chain,
  {
    content: "Approved budget increase for Q2 2026 — unanimously. Motion: Jane Smith.",
    publicKey,
  },
  privateKey,
);

if (!result.ok) throw result.error;
const updatedChain = result.value;
```

Each appended block:
- Gets a monotonically increasing `blockNumber`
- Contains the `SHA-256` hash of the previous block
- Is signed with the author's private key
- Gets an ISO 8601 timestamp

### `forkChain`

Forks preserve the full original history up to a chosen block, then diverge. Use this when a chain has been compromised, an organisation splits, or a community wants to preserve a version at a point in time.

```typescript
import { forkChain } from "@glorychain/core";

const result = forkChain(
  originalChain,
  12,  // preserve blocks 0–12, diverge from here
  {
    content:      "Fork created — original chain administrator lost private key on 2026-03-01",
    purpose:      "Governance",
    creatorId:    "user-123",
    identityType: "oauth",
    publicKey,
    forkReason:   "Key compromise",
  },
  privateKey,
);
```

A fork creates visible lineage. The original chain still exists. The new chain carries its history. **A chain that has never been forked carries implicit community endorsement.**

### `migrateChain`

Migration moves a chain to a new persistence layer. It's a last resort — every migration leaves a permanent provenance scar in the chain metadata.

```typescript
import { migrateChain } from "@glorychain/core";

const result = migrateChain(chain, targetConnector);
```

---

## Verification

```typescript
import { verifyChain } from "@glorychain/core";

const result = await verifyChain(chain);

console.log(result.valid);             // true | false
console.log(result.blockCount);        // number of blocks verified
console.log(result.lastVerifiedBlock); // index of last passing block
console.log(result.errors);            // array of VerificationError — empty if valid
```

Verification is **deterministic** — same chain, same blocks, same result, always, on any runtime. It checks:

- Every block's `previousHash` matches the prior block's SHA-256 hash
- Every block signature is valid against its `publicKey`
- Exactly one genesis block exists at position 0
- Block numbers are monotonically increasing
- Every block conforms to the protocol Zod schema

---

## Block inspection

```typescript
import { inspectBlock } from "@glorychain/core";

const genesis = chain.blocks[0];          // GenesisBlock
const latest  = chain.blocks.at(-1);      // Block
const block5  = chain.blocks[5];          // Block | undefined
const count   = chain.blocks.length;      // number

const { type, block } = inspectBlock(chain.blocks[0]);
```

---

## RSS / Atom feed generation

Every chain exposes a standard feed. The open web — including the Internet Archive — passively archives public chains without any platform effort.

```typescript
import { generateFeed } from "@glorychain/core";

const atom = generateFeed(chain, { baseUrl: "https://example.com" });  // Atom 1.0 XML string
```

The feed is valid and parseable by any standard feed reader. Subscribers get new block notifications without polling your server.

---

## Block signing / verification (low-level)

For integrators building custom connectors or tooling:

```typescript
import { signBlock, verifyBlock } from "@glorychain/core";

// Sign raw block data
const signResult = signBlock(blockData, privateKey);
if (!signResult.ok) throw signResult.error;
const signature = signResult.value;  // string

// Verify a single block
const verifyResult = verifyBlock(block);
if (!verifyResult.ok) throw verifyResult.error;
const isValid = verifyResult.value;  // boolean
```

---

## TypeScript types

```typescript
import type {
  Chain,
  ChainMetadata,
  Block,
  GenesisBlock,
  CreateChainInput,
  AppendBlockInput,
  ForkChainInput,
  VerificationResult,
  VerificationError,
  GloryChainError,
  Result,
} from "@glorychain/core";
```

All types are exported from the package root. The `Result<T, E>` type follows the standard discriminated union pattern:

```typescript
type Result<T, E = GloryChainError> =
  | { ok: true;  value: T }
  | { ok: false; error: E };
```

---

## Block data model

```typescript
type Block = {
  blockNumber:  number;         // 0 = genesis, monotonically increasing
  content:      string;         // arbitrary UTF-8 content
  publicKey:    string;         // base64url SPKI Ed25519 public key
  signature:    string;         // base64url Ed25519 signature
  previousHash: string | null;  // null for genesis block only
  hash:         string;         // SHA-256 of canonical block content
  timestamp:    string;         // ISO 8601
};

type ChainMetadata = {
  chainId:          string;   // UUID
  createdAt:        string;   // ISO 8601
  protocolVersion:  string;   // e.g. "0.0.1"
  hashAlgorithm:    string;
  signatureScheme:  string;
  migrationHistory: unknown[];
  knownForks:       unknown[];
  transferHistory:  unknown[];
};

type Chain = {
  metadata: ChainMetadata;
  blocks:   [GenesisBlock, ...Block[]];
};
```

---

## Error types

```typescript
import { ErrorCode } from "@glorychain/core";

// ErrorCode enum values include:
// ErrorCode.INVALID_SIGNATURE
// ErrorCode.BROKEN_CHAIN
// ErrorCode.INVALID_HASH
// ErrorCode.SCHEMA_VIOLATION

type GloryChainError = {
  code:    ErrorCode;
  message: string;
};
```

---

## Connector interface

`@glorychain/core` defines the connector interface contract — the public API that all persistence adapters must implement:

```typescript
interface Connector {
  version: string;
  read(chainId: string): Promise<Chain>;
  write(chain: Chain): Promise<void>;
  watch(chainId: string): AsyncIterable<ThreatEvent>;
  migrate(chainId: string, target: Connector): Promise<void>;
  verify(chainId: string): Promise<VerificationResult>;
}
```

Any persistence target — filesystem, GitHub, IPFS, S3, a database — can be supported by implementing this interface. The connector interface is versioned with documented backwards compatibility guarantees.

See [`@glorychain/fs`](../fs/README.md) and [`@glorychain/github`](../github/README.md) for reference implementations.
