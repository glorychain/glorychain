# Story 2.3 — Chain Lifecycle: Create, Append, Fork, Migrate

**Story ID:** 2.3
**Story Key:** `2-3-chain-lifecycle-create-append-fork-migrate`
**Epic:** 2 — Core Protocol Library
**Status:** done
**Created:** 2026-03-22

---

## Story

As a developer building on Glory Chain, I want chain lifecycle functions — `createChain`, `appendBlock`, `forkChain`, and `migrateChain` — implemented in `packages/core/src/chain/`, so that I can create and evolve chains with cryptographically sound, tamper-evident block sequences, provenance-tracked forks, and permanent migration records, all returned via `Result<T,E>` with no thrown errors.

---

## Background and Context

Stories 2.1 and 2.2 delivered the TypeScript types and cryptographic primitives. This story builds the chain engine on top of them — the four lifecycle operations that callers use to create and evolve chains.

Key architectural invariants from the spec:
- **FR1** — `createChain` creates a genesis block (blockNumber: 0, previousHash: null)
- **FR2** — `appendBlock` appends to an existing chain; chain ID is included in the signed payload to prevent replay attacks (FR12)
- **FR5, FR51, FR52** — `forkChain` creates a new chain that diverges from a source chain at a given block; provenance reference to source block is stored
- **FR6** — `migrateChain` records a permanent migration event in `ChainMetadata`; migration history is never deleted
- **No thrown errors** — all functions return `Result<T, GloryChainError>`
- **FR56** — block hashes are deterministic; given the same inputs, hash output is always the same
- **NFR14** — zero runtime dependencies

### Canonical Payload Format

Block hash and signature are computed over a canonical payload string. The canonical payload is a deterministic JSON serialization of the signable fields. This must be consistent across create, append, and verify (Story 2.5).

**For GenesisBlock:**
```
canonical = JSON.stringify({
  blockNumber: 0,
  chainId,
  content,
  timestamp,
  previousHash: null,
  protocolVersion,
  creatorId,
  purpose,
  identityType,
  hashAlgorithm,
  signatureScheme,
})
```

**For Block (non-genesis):**
```
canonical = JSON.stringify({
  blockNumber,
  chainId,
  content,
  timestamp,
  previousHash,
  protocolVersion,
})
```

Keys are in a fixed order (alphabetical within each type). `JSON.stringify` on a plain object with keys in insertion order is deterministic in V8/Node.js. The canonical payload is what gets hashed AND signed.

The `hash` field = `hashBlock(canonical, hashAlgorithm)` result.
The `signature` field = `signBlock(canonical, privateKey, signatureScheme)` result.

---

## Acceptance Criteria

### AC-1: File Structure
- `packages/core/src/chain/create.ts`
- `packages/core/src/chain/append.ts`
- `packages/core/src/chain/fork.ts`
- `packages/core/src/chain/migrate.ts`
- `packages/core/src/chain/index.ts`
- `packages/core/src/chain/create.test.ts`
- `packages/core/src/chain/append.test.ts`
- `packages/core/src/chain/fork.test.ts`
- `packages/core/src/chain/migrate.test.ts`

### AC-2: createChain
`createChain(input, privateKey)` returns `Result<Chain, GloryChainError>`:
- Generates a `GenesisBlock` with `blockNumber: 0`, `previousHash: null`
- `chainId` is a fresh UUID v4 (use `node:crypto` `randomUUID()`)
- `timestamp` is current ISO8601 (use `new Date().toISOString() as ISO8601`)
- `protocolVersion` is the package version constant `'0.0.1'`
- `hash` and `signature` computed over canonical payload
- Returns a `Chain` with `metadata` and `blocks: [genesisBlock]`
- `ChainMetadata.migrationHistory`, `knownForks`, `transferHistory` all start as `[]`

### AC-3: appendBlock
`appendBlock(chain, input, privateKey)` returns `Result<Chain, GloryChainError>`:
- Appends a new `Block` with `blockNumber = chain.blocks.length`
- `previousHash` = hash of the last block in the chain
- `chainId` copied from chain metadata (included in signed payload — FR12 replay prevention)
- `hash` and `signature` computed over canonical payload
- Returns new `Chain` with the block appended (immutable — does not mutate input chain)
- Returns `BROKEN_CHAIN` error if chain has no blocks (shouldn't happen with correct types but guard it)

### AC-4: forkChain
`forkChain(sourceChain, forkFromBlockNumber, input, privateKey)` returns `Result<Chain, GloryChainError>`:
- Creates a new chain forked from `sourceChain` at `forkFromBlockNumber`
- New chain has a `ForkGenesisBlock` as its genesis block (blockNumber: 0)
- `ForkGenesisBlock.forkOf` = source chain's chainId
- `ForkGenesisBlock.forkFromBlock` = `forkFromBlockNumber`
- `ForkGenesisBlock.forkSourceBlockHash` = hash of the block at `forkFromBlockNumber` in source chain
- Returns `CHAIN_NOT_FOUND` error if `forkFromBlockNumber` is out of range
- The returned `Chain` metadata has a fresh chainId, empty migrationHistory/transferHistory, empty knownForks
- Does NOT mutate the source chain — caller is responsible for updating source chain's `knownForks` via `recordForkOnSource`

### AC-5: recordForkOnSource helper
`recordForkOnSource(sourceChain, forkChainId, forkFromBlockNumber, forkSourceBlockHash)` returns `Chain`:
- Returns updated source chain with the new `ForkReference` appended to `metadata.knownForks`
- Pure function — does not mutate input

### AC-6: migrateChain
`migrateChain(chain, fromConnector, toConnector, reason?)` returns `Chain`:
- Returns updated chain with a new `MigrationEvent` appended to `metadata.migrationHistory`
- `timestamp` is current ISO8601
- Pure function — does not mutate input, does not throw

### AC-7: PROTOCOL_VERSION constant exported
`PROTOCOL_VERSION = '0.0.1'` exported from `packages/core/src/chain/index.ts` and from root `index.ts`.

### AC-8: Tests pass
All tests pass. Tests cover:
- `createChain` — creates chain with correct structure, correct blockNumber, correct genesis fields
- `appendBlock` — correct blockNumber sequence, previousHash linkage
- `forkChain` — correct forkOf/forkFromBlock/forkSourceBlockHash, fresh chainId
- `migrateChain` — migration event appended, original chain unchanged
- `recordForkOnSource` — knownForks updated, original chain unchanged

### AC-9: Full pipeline passes
`pnpm turbo build test typecheck lint --filter=@glory-chain/core` exits 0.

---

## Tasks

### Task 1: Create packages/core/src/chain/create.ts
### Task 2: Create packages/core/src/chain/append.ts
### Task 3: Create packages/core/src/chain/fork.ts
### Task 4: Create packages/core/src/chain/migrate.ts
### Task 5: Create packages/core/src/chain/index.ts
### Task 6: Update packages/core/src/index.ts — add chain exports
### Task 7: Create test files for all four modules
### Task 8: Run full pipeline

---

## Dev Notes

### randomUUID from node:crypto

```typescript
import { randomUUID } from 'node:crypto';
const chainId = randomUUID(); // returns UUID v4 string
```

### ISO8601 cast

`new Date().toISOString()` returns a `string`, not `ISO8601`. Cast it:
```typescript
import type { ISO8601 } from '../schema/block.js';
const timestamp = new Date().toISOString() as ISO8601;
```

### Canonical payload construction

The canonical payload must use a fixed key order to be deterministic. Use an explicit object literal with keys in the exact order listed in the Background section. Do NOT spread or use `Object.assign` — key insertion order must be explicit.

```typescript
const canonical = JSON.stringify({
  blockNumber: 0,
  chainId,
  content,
  timestamp,
  previousHash: null,
  protocolVersion,
  creatorId,
  purpose,
  identityType,
  hashAlgorithm,
  signatureScheme,
});
```

### Immutability

All functions return new objects — never mutate the input chain. Use spread syntax for shallow copies of arrays:

```typescript
// Correct
return { ...chain, blocks: [...chain.blocks, newBlock] };

// Wrong — mutates input
chain.blocks.push(newBlock);
```

For metadata updates:
```typescript
return {
  ...chain,
  metadata: {
    ...chain.metadata,
    migrationHistory: [...chain.metadata.migrationHistory, event],
  },
};
```

### Type assertion for blocks tuple

TypeScript's type for `Chain.blocks` is `[GenesisBlock, ...Block[]]`. When appending:
```typescript
const newBlocks = [...chain.blocks, newBlock] as [GenesisBlock, ...Block[]];
```

The `as` cast is safe here because we know the first element is always a GenesisBlock.

### forkChain — ForkGenesisBlock construction

`ForkGenesisBlock` extends `GenesisBlock`. The fork genesis block needs all genesis fields plus the fork-specific fields. The `input` parameter for `forkChain` should include: `content`, `purpose`, `identityType`, `hashAlgorithm`, `signatureScheme`, `creatorId`, and the fork-specific `forkReason?`.

The fork genesis canonical payload uses the GenesisBlock format (blockNumber: 0, previousHash: null) but with the fork's chainId.

### Error handling for hashBlock/signBlock

`hashBlock` and `signBlock` return `Result`. Propagate failures:

```typescript
const hashResult = hashBlock(canonical, hashAlgorithm);
if (!hashResult.ok) return hashResult;
const hash = hashResult.value;
```

---

## Complete Implementation

### packages/core/src/chain/create.ts

```typescript
import { randomUUID } from "node:crypto";
import type { Chain, ChainMetadata } from "../schema/chain.js";
import type { GenesisBlock, ISO8601 } from "../schema/block.js";
import type { GloryChainError, Result } from "../schema/errors.js";
import { hashBlock } from "../crypto/hash.js";
import { signBlock } from "../crypto/sign.js";

export const PROTOCOL_VERSION = "0.0.1";

export interface CreateChainInput {
  content: string;
  purpose: string;
  creatorId: string;
  identityType: "oauth" | "external" | "anonymous";
  hashAlgorithm?: string;
  signatureScheme?: string;
}

export function createChain(
  input: CreateChainInput,
  privateKey: string,
): Result<Chain, GloryChainError> {
  const {
    content,
    purpose,
    creatorId,
    identityType,
    hashAlgorithm = "sha256",
    signatureScheme = "ed25519",
  } = input;

  const chainId = randomUUID();
  const timestamp = new Date().toISOString() as ISO8601;
  const protocolVersion = PROTOCOL_VERSION;

  const canonical = JSON.stringify({
    blockNumber: 0,
    chainId,
    content,
    timestamp,
    previousHash: null,
    protocolVersion,
    creatorId,
    purpose,
    identityType,
    hashAlgorithm,
    signatureScheme,
  });

  const hashResult = hashBlock(canonical, hashAlgorithm);
  if (!hashResult.ok) return hashResult;

  const signResult = signBlock(canonical, privateKey, signatureScheme);
  if (!signResult.ok) return signResult;

  const genesisBlock: GenesisBlock = {
    blockNumber: 0,
    chainId,
    content,
    timestamp,
    previousHash: null,
    hash: hashResult.value,
    signature: signResult.value,
    publicKey: "", // set by caller after keygen — placeholder filled by appendBlock pattern
    protocolVersion,
    creatorId,
    purpose,
    identityType,
    hashAlgorithm,
    signatureScheme,
  };

  const metadata: ChainMetadata = {
    chainId,
    createdAt: timestamp,
    protocolVersion,
    hashAlgorithm,
    signatureScheme,
    migrationHistory: [],
    knownForks: [],
    transferHistory: [],
  };

  return { ok: true, value: { metadata, blocks: [genesisBlock] } };
}
```

Wait — `publicKey` needs to be passed in. The caller has both private and public key from `generateKeypair`. Update `CreateChainInput` to include `publicKey`.

### Revised packages/core/src/chain/create.ts

```typescript
import { randomUUID } from "node:crypto";
import type { Chain, ChainMetadata } from "../schema/chain.js";
import type { GenesisBlock, ISO8601 } from "../schema/block.js";
import type { GloryChainError, Result } from "../schema/errors.js";
import { hashBlock } from "../crypto/hash.js";
import { signBlock } from "../crypto/sign.js";

export const PROTOCOL_VERSION = "0.0.1";

export interface CreateChainInput {
  content: string;
  purpose: string;
  creatorId: string;
  identityType: "oauth" | "external" | "anonymous";
  publicKey: string;          // Base64url-encoded public key
  hashAlgorithm?: string;
  signatureScheme?: string;
}

export function createChain(
  input: CreateChainInput,
  privateKey: string,
): Result<Chain, GloryChainError> {
  const {
    content,
    purpose,
    creatorId,
    identityType,
    publicKey,
    hashAlgorithm = "sha256",
    signatureScheme = "ed25519",
  } = input;

  const chainId = randomUUID();
  const timestamp = new Date().toISOString() as ISO8601;
  const protocolVersion = PROTOCOL_VERSION;

  const canonical = JSON.stringify({
    blockNumber: 0,
    chainId,
    content,
    timestamp,
    previousHash: null,
    protocolVersion,
    creatorId,
    purpose,
    identityType,
    hashAlgorithm,
    signatureScheme,
  });

  const hashResult = hashBlock(canonical, hashAlgorithm);
  if (!hashResult.ok) return hashResult;

  const signResult = signBlock(canonical, privateKey, signatureScheme);
  if (!signResult.ok) return signResult;

  const genesisBlock: GenesisBlock = {
    blockNumber: 0,
    chainId,
    content,
    timestamp,
    previousHash: null,
    hash: hashResult.value,
    signature: signResult.value,
    publicKey,
    protocolVersion,
    creatorId,
    purpose,
    identityType,
    hashAlgorithm,
    signatureScheme,
  };

  const metadata: ChainMetadata = {
    chainId,
    createdAt: timestamp,
    protocolVersion,
    hashAlgorithm,
    signatureScheme,
    migrationHistory: [],
    knownForks: [],
    transferHistory: [],
  };

  return { ok: true, value: { metadata, blocks: [genesisBlock] } };
}
```

### packages/core/src/chain/append.ts

```typescript
import type { Chain } from "../schema/chain.js";
import type { Block, ISO8601 } from "../schema/block.js";
import type { GloryChainError, Result } from "../schema/errors.js";
import { ErrorCode } from "../schema/errors.js";
import { hashBlock } from "../crypto/hash.js";
import { signBlock } from "../crypto/sign.js";
import { PROTOCOL_VERSION } from "./create.js";

export interface AppendBlockInput {
  content: string;
  publicKey: string;  // Base64url-encoded public key
}

export function appendBlock(
  chain: Chain,
  input: AppendBlockInput,
  privateKey: string,
): Result<Chain, GloryChainError> {
  const { content, publicKey } = input;

  if (chain.blocks.length === 0) {
    return {
      ok: false,
      error: { code: ErrorCode.BROKEN_CHAIN, message: "Chain has no blocks" },
    };
  }

  const lastBlock = chain.blocks[chain.blocks.length - 1];
  if (!lastBlock) {
    return {
      ok: false,
      error: { code: ErrorCode.BROKEN_CHAIN, message: "Chain has no blocks" },
    };
  }

  const blockNumber = chain.blocks.length; // 0-indexed genesis means next is length
  const chainId = chain.metadata.chainId;
  const previousHash = lastBlock.hash;
  const timestamp = new Date().toISOString() as ISO8601;
  const protocolVersion = PROTOCOL_VERSION;
  const { hashAlgorithm, signatureScheme } = chain.metadata;

  const canonical = JSON.stringify({
    blockNumber,
    chainId,
    content,
    timestamp,
    previousHash,
    protocolVersion,
  });

  const hashResult = hashBlock(canonical, hashAlgorithm);
  if (!hashResult.ok) return hashResult;

  const signResult = signBlock(canonical, privateKey, signatureScheme);
  if (!signResult.ok) return signResult;

  const newBlock: Block = {
    blockNumber,
    chainId,
    content,
    timestamp,
    previousHash,
    hash: hashResult.value,
    signature: signResult.value,
    publicKey,
    protocolVersion,
  };

  const newBlocks = [...chain.blocks, newBlock] as [typeof chain.blocks[0], ...Block[]];
  return { ok: true, value: { ...chain, blocks: newBlocks } };
}
```

### packages/core/src/chain/fork.ts

```typescript
import { randomUUID } from "node:crypto";
import type { Chain, ChainMetadata, ForkReference } from "../schema/chain.js";
import type { ForkGenesisBlock, ISO8601 } from "../schema/block.js";
import type { GloryChainError, Result } from "../schema/errors.js";
import { ErrorCode } from "../schema/errors.js";
import { hashBlock } from "../crypto/hash.js";
import { signBlock } from "../crypto/sign.js";
import { PROTOCOL_VERSION } from "./create.js";

export interface ForkChainInput {
  content: string;
  purpose: string;
  creatorId: string;
  identityType: "oauth" | "external" | "anonymous";
  publicKey: string;
  hashAlgorithm?: string;
  signatureScheme?: string;
  forkReason?: string;
}

export function forkChain(
  sourceChain: Chain,
  forkFromBlockNumber: number,
  input: ForkChainInput,
  privateKey: string,
): Result<Chain, GloryChainError> {
  const sourceBlock = sourceChain.blocks[forkFromBlockNumber];
  if (sourceBlock === undefined) {
    return {
      ok: false,
      error: {
        code: ErrorCode.CHAIN_NOT_FOUND,
        message: `Block ${forkFromBlockNumber} not found in source chain`,
        blockNumber: forkFromBlockNumber,
      },
    };
  }

  const {
    content,
    purpose,
    creatorId,
    identityType,
    publicKey,
    hashAlgorithm = sourceChain.metadata.hashAlgorithm,
    signatureScheme = sourceChain.metadata.signatureScheme,
    forkReason,
  } = input;

  const chainId = randomUUID();
  const timestamp = new Date().toISOString() as ISO8601;
  const protocolVersion = PROTOCOL_VERSION;
  const forkSourceBlockHash = sourceBlock.hash;

  const canonical = JSON.stringify({
    blockNumber: 0,
    chainId,
    content,
    timestamp,
    previousHash: null,
    protocolVersion,
    creatorId,
    purpose,
    identityType,
    hashAlgorithm,
    signatureScheme,
  });

  const hashResult = hashBlock(canonical, hashAlgorithm);
  if (!hashResult.ok) return hashResult;

  const signResult = signBlock(canonical, privateKey, signatureScheme);
  if (!signResult.ok) return signResult;

  const forkGenesisBlock: ForkGenesisBlock = {
    blockNumber: 0,
    chainId,
    content,
    timestamp,
    previousHash: null,
    hash: hashResult.value,
    signature: signResult.value,
    publicKey,
    protocolVersion,
    creatorId,
    purpose,
    identityType,
    hashAlgorithm,
    signatureScheme,
    forkOf: sourceChain.metadata.chainId,
    forkFromBlock: forkFromBlockNumber,
    forkSourceBlockHash,
    forkReason,
  };

  const metadata: ChainMetadata = {
    chainId,
    createdAt: timestamp,
    protocolVersion,
    hashAlgorithm,
    signatureScheme,
    migrationHistory: [],
    knownForks: [],
    transferHistory: [],
  };

  return { ok: true, value: { metadata, blocks: [forkGenesisBlock] } };
}

export function recordForkOnSource(
  sourceChain: Chain,
  forkChainId: string,
  forkFromBlock: number,
  forkSourceBlockHash: string,
): Chain {
  const ref: ForkReference = {
    forkChainId,
    forkFromBlock,
    forkSourceBlockHash,
    createdAt: new Date().toISOString() as ISO8601,
  };
  return {
    ...sourceChain,
    metadata: {
      ...sourceChain.metadata,
      knownForks: [...sourceChain.metadata.knownForks, ref],
    },
  };
}
```

### packages/core/src/chain/migrate.ts

```typescript
import type { Chain, MigrationEvent } from "../schema/chain.js";
import type { ISO8601 } from "../schema/block.js";

export function migrateChain(
  chain: Chain,
  fromConnector: string,
  toConnector: string,
  reason?: string,
): Chain {
  const event: MigrationEvent = {
    fromConnector,
    toConnector,
    timestamp: new Date().toISOString() as ISO8601,
    reason,
  };
  return {
    ...chain,
    metadata: {
      ...chain.metadata,
      migrationHistory: [...chain.metadata.migrationHistory, event],
    },
  };
}
```

### packages/core/src/chain/index.ts

```typescript
export { PROTOCOL_VERSION, createChain } from "./create.js";
export type { CreateChainInput } from "./create.js";
export { appendBlock } from "./append.js";
export type { AppendBlockInput } from "./append.js";
export { forkChain, recordForkOnSource } from "./fork.js";
export type { ForkChainInput } from "./fork.js";
export { migrateChain } from "./migrate.js";
```

---

## Test Implementations

### packages/core/src/chain/create.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { generateKeypair } from "../crypto/keygen.js";
import { createChain } from "./create.js";

function makeKeypair() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  return kp.value;
}

describe("createChain", () => {
  it("creates a chain with genesis block at index 0", () => {
    const kp = makeKeypair();
    const result = createChain(
      { content: "hello", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.publicKey },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.blocks.length).toBe(1);
    expect(result.value.blocks[0]?.blockNumber).toBe(0);
  });

  it("genesis block has null previousHash", () => {
    const kp = makeKeypair();
    const result = createChain(
      { content: "hello", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.publicKey },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.blocks[0]?.previousHash).toBeNull();
  });

  it("chain metadata has matching chainId", () => {
    const kp = makeKeypair();
    const result = createChain(
      { content: "hello", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.publicKey },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const genesis = result.value.blocks[0];
    expect(result.value.metadata.chainId).toBe(genesis?.chainId);
  });

  it("migration/fork/transfer histories are empty", () => {
    const kp = makeKeypair();
    const result = createChain(
      { content: "hello", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.publicKey },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.metadata.migrationHistory).toEqual([]);
    expect(result.value.metadata.knownForks).toEqual([]);
    expect(result.value.metadata.transferHistory).toEqual([]);
  });

  it("genesis block has non-empty hash and signature", () => {
    const kp = makeKeypair();
    const result = createChain(
      { content: "hello", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.publicKey },
      kp.privateKey,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const genesis = result.value.blocks[0];
    expect(genesis?.hash).toHaveLength(64);
    expect(genesis?.signature.length).toBeGreaterThan(0);
  });
});
```

### packages/core/src/chain/append.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { generateKeypair } from "../crypto/keygen.js";
import { createChain } from "./create.js";
import { appendBlock } from "./append.js";

function makeChain() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain = createChain(
    { content: "genesis", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.value.publicKey },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  return { chain: chain.value, kp: kp.value };
}

describe("appendBlock", () => {
  it("appends a block with correct blockNumber", () => {
    const { chain, kp } = makeChain();
    const result = appendBlock(chain, { content: "block 1", publicKey: kp.publicKey }, kp.privateKey);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.blocks.length).toBe(2);
    expect(result.value.blocks[1]?.blockNumber).toBe(1);
  });

  it("previousHash of new block matches hash of preceding block", () => {
    const { chain, kp } = makeChain();
    const result = appendBlock(chain, { content: "block 1", publicKey: kp.publicKey }, kp.privateKey);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const genesis = result.value.blocks[0];
    const block1 = result.value.blocks[1];
    expect(block1?.previousHash).toBe(genesis?.hash);
  });

  it("does not mutate original chain", () => {
    const { chain, kp } = makeChain();
    const originalLength = chain.blocks.length;
    appendBlock(chain, { content: "block 1", publicKey: kp.publicKey }, kp.privateKey);
    expect(chain.blocks.length).toBe(originalLength);
  });

  it("can append multiple blocks in sequence", () => {
    const { chain: chain0, kp } = makeChain();
    const r1 = appendBlock(chain0, { content: "b1", publicKey: kp.publicKey }, kp.privateKey);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = appendBlock(r1.value, { content: "b2", publicKey: kp.publicKey }, kp.privateKey);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.value.blocks.length).toBe(3);
    expect(r2.value.blocks[2]?.previousHash).toBe(r2.value.blocks[1]?.hash);
  });
});
```

### packages/core/src/chain/fork.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { generateKeypair } from "../crypto/keygen.js";
import { createChain } from "./create.js";
import { appendBlock } from "./append.js";
import { forkChain, recordForkOnSource } from "./fork.js";

function makeChainWithBlocks() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain0 = createChain(
    { content: "genesis", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.value.publicKey },
    kp.value.privateKey,
  );
  if (!chain0.ok) throw new Error("createChain failed");
  const r1 = appendBlock(chain0.value, { content: "b1", publicKey: kp.value.publicKey }, kp.value.privateKey);
  if (!r1.ok) throw new Error("appendBlock failed");
  return { chain: r1.value, kp: kp.value };
}

describe("forkChain", () => {
  it("creates a new chain with different chainId", () => {
    const { chain, kp } = makeChainWithBlocks();
    const result = forkChain(chain, 1, { content: "fork genesis", purpose: "fork", creatorId: "user2", identityType: "anonymous", publicKey: kp.publicKey }, kp.privateKey);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.metadata.chainId).not.toBe(chain.metadata.chainId);
  });

  it("fork genesis block has correct forkOf and forkFromBlock", () => {
    const { chain, kp } = makeChainWithBlocks();
    const result = forkChain(chain, 1, { content: "fork genesis", purpose: "fork", creatorId: "user2", identityType: "anonymous", publicKey: kp.publicKey }, kp.privateKey);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const forkGenesis = result.value.blocks[0];
    expect(forkGenesis?.forkOf).toBe(chain.metadata.chainId);
    expect(forkGenesis?.forkFromBlock).toBe(1);
  });

  it("forkSourceBlockHash matches source block hash", () => {
    const { chain, kp } = makeChainWithBlocks();
    const result = forkChain(chain, 1, { content: "fork genesis", purpose: "fork", creatorId: "user2", identityType: "anonymous", publicKey: kp.publicKey }, kp.privateKey);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const forkGenesis = result.value.blocks[0];
    expect(forkGenesis?.forkSourceBlockHash).toBe(chain.blocks[1]?.hash);
  });

  it("returns CHAIN_NOT_FOUND for out-of-range block number", () => {
    const { chain, kp } = makeChainWithBlocks();
    const result = forkChain(chain, 99, { content: "fork genesis", purpose: "fork", creatorId: "user2", identityType: "anonymous", publicKey: kp.publicKey }, kp.privateKey);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CHAIN_NOT_FOUND");
    }
  });
});

describe("recordForkOnSource", () => {
  it("appends fork reference to source chain knownForks", () => {
    const { chain } = makeChainWithBlocks();
    const updated = recordForkOnSource(chain, "fork-chain-id", 1, "abc123");
    expect(updated.metadata.knownForks.length).toBe(1);
    expect(updated.metadata.knownForks[0]?.forkChainId).toBe("fork-chain-id");
  });

  it("does not mutate source chain", () => {
    const { chain } = makeChainWithBlocks();
    recordForkOnSource(chain, "fork-chain-id", 1, "abc123");
    expect(chain.metadata.knownForks.length).toBe(0);
  });
});
```

### packages/core/src/chain/migrate.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { generateKeypair } from "../crypto/keygen.js";
import { createChain } from "./create.js";
import { migrateChain } from "./migrate.js";

function makeChain() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain = createChain(
    { content: "genesis", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.value.publicKey },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  return chain.value;
}

describe("migrateChain", () => {
  it("appends migration event to migrationHistory", () => {
    const chain = makeChain();
    const migrated = migrateChain(chain, "fs", "github", "moving to github");
    expect(migrated.metadata.migrationHistory.length).toBe(1);
    const event = migrated.metadata.migrationHistory[0];
    expect(event?.fromConnector).toBe("fs");
    expect(event?.toConnector).toBe("github");
    expect(event?.reason).toBe("moving to github");
  });

  it("does not mutate original chain", () => {
    const chain = makeChain();
    migrateChain(chain, "fs", "github");
    expect(chain.metadata.migrationHistory.length).toBe(0);
  });

  it("can record multiple migrations", () => {
    const chain = makeChain();
    const m1 = migrateChain(chain, "fs", "github");
    const m2 = migrateChain(m1, "github", "fs", "reverting");
    expect(m2.metadata.migrationHistory.length).toBe(2);
  });

  it("migration event has ISO8601 timestamp", () => {
    const chain = makeChain();
    const migrated = migrateChain(chain, "fs", "github");
    const ts = migrated.metadata.migrationHistory[0]?.timestamp;
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
```

---

## Traceability

| AC | Requirement |
|----|-------------|
| createChain | FR1 — chain creation |
| appendBlock with chainId in payload | FR2, FR12 — append + replay prevention |
| forkChain with provenance | FR5, FR51, FR52 — fork with source reference |
| migrateChain permanent record | FR6 — migration history never deleted |
| All Result<T,E> returns | Architecture — no thrown errors |
| PROTOCOL_VERSION constant | FR14 — protocol version on every block |
| Deterministic canonical payload | FR56 — deterministic hash/signature |
| Zero runtime deps | NFR14 |

---

## Out of Scope

- Block verification (Story 2.5)
- Chain verification (Story 2.5)
- Connector implementations (Epics 3, 5)
- Key storage (Story 4.x)

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
- `packages/core/src/chain/create.ts`
- `packages/core/src/chain/append.ts`
- `packages/core/src/chain/fork.ts`
- `packages/core/src/chain/migrate.ts`
- `packages/core/src/chain/index.ts`
- `packages/core/src/chain/create.test.ts`
- `packages/core/src/chain/append.test.ts`
- `packages/core/src/chain/fork.test.ts`
- `packages/core/src/chain/migrate.test.ts`
- `packages/core/src/index.ts` (updated — add chain exports)
