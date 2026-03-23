# Story 2.4 — Block Construction and Inspection

**Story ID:** 2.4
**Story Key:** `2-4-block-construction-and-inspection`
**Epic:** 2 — Core Protocol Library
**Status:** done
**Created:** 2026-03-22

---

## Story

As a developer building on Glory Chain, I want utility functions for block construction (computing canonical payload, hash, and signature) and block inspection (reading raw block structure without side effects), so that the verification engine (Story 2.5) and CLI `inspect` command (Story 4.3) have a stable, tested foundation to build on.

---

## Background and Context

Stories 2.2 and 2.3 implement the crypto primitives and chain lifecycle functions. The lifecycle functions (`createChain`, `appendBlock`) already compute hashes and signatures inline. This story extracts the canonical payload computation into a shared utility module so the verification engine (Story 2.5) can recompute hashes deterministically from existing blocks without duplicating logic.

**FR13** — `glory-chain inspect` must display the raw block structure. The inspection functions provide the data; the CLI formats it.

**FR56** — determinism: the canonical payload function must produce identical output given identical inputs, enabling the verifier to recompute and compare hashes.

Key insight: **the canonical payload is the source of truth**. Hash = SHA-256(canonical). Signature = Ed25519(canonical, privateKey). Verification = recompute canonical from block fields → recompute hash → compare → verify signature.

---

## Acceptance Criteria

### AC-1: File Structure
- `packages/core/src/block/canonical.ts` — canonical payload computation
- `packages/core/src/block/inspect.ts` — block inspection utilities
- `packages/core/src/block/index.ts` — re-exports
- `packages/core/src/block/canonical.test.ts`
- `packages/core/src/block/inspect.test.ts`

### AC-2: canonicalPayload functions
- `genesisCanonical(block: GenesisBlock): string` — returns deterministic JSON string for genesis block
- `blockCanonical(block: Block): string` — returns deterministic JSON string for standard block
- Both functions use fixed key insertion order (same order as `createChain`/`appendBlock`)
- Pure functions — no I/O, no side effects

### AC-3: computeBlockHash
- `computeBlockHash(block: Block | GenesisBlock, algorithm?: string): Result<string, GloryChainError>`
- Recomputes the hash from the block's fields using the canonical payload
- Default algorithm from block's `hashAlgorithm` (genesis) or chain metadata — pass explicitly
- Used by verification engine to compare against stored `block.hash`

### AC-4: inspectBlock
- `inspectBlock(block: Block | GenesisBlock): BlockInspection` — returns a plain object with all block fields
- `BlockInspection` type exported — mirrors block fields plus a `type: 'genesis' | 'block'` discriminant
- Pure function — never throws, no side effects

### AC-5: isGenesisBlock type guard
- `isGenesisBlock(block: Block | GenesisBlock): block is GenesisBlock`
- Returns true if `block.blockNumber === 0`

### AC-6: Tests pass, full pipeline green

---

## Tasks

### Task 1: Create packages/core/src/block/canonical.ts
### Task 2: Create packages/core/src/block/inspect.ts
### Task 3: Create packages/core/src/block/index.ts
### Task 4: Update packages/core/src/index.ts — add block exports
### Task 5: Create test files
### Task 6: Run full pipeline

---

## Dev Notes

### Canonical Payload — Key Order Must Match chain/create.ts and chain/append.ts

The verification engine will call `genesisCanonical`/`blockCanonical` to recompute hashes. The key order **must exactly match** what `createChain` and `appendBlock` use, otherwise verification will fail.

Genesis canonical key order:
```
blockNumber, chainId, content, timestamp, previousHash, protocolVersion,
creatorId, purpose, identityType, hashAlgorithm, signatureScheme
```

Block canonical key order:
```
blockNumber, chainId, content, timestamp, previousHash, protocolVersion
```

### GenesisBlock discrimination

`Block` has `blockNumber: number` and `previousHash: string`.
`GenesisBlock` has `blockNumber: 0` (literal) and `previousHash: null`.

`isGenesisBlock` checks `block.blockNumber === 0`. Since `Block.blockNumber` is `number` and `GenesisBlock.blockNumber` is `0`, this narrows correctly.

### BlockInspection type

```typescript
export type BlockInspection =
  | { type: 'genesis'; block: GenesisBlock }
  | { type: 'block'; block: Block };
```

`inspectBlock` just wraps the block with the discriminant. Simple.

---

## Complete Implementation

### packages/core/src/block/canonical.ts

```typescript
import type { Block, GenesisBlock } from "../schema/block.js";

export function genesisCanonical(block: GenesisBlock): string {
  return JSON.stringify({
    blockNumber: block.blockNumber,
    chainId: block.chainId,
    content: block.content,
    timestamp: block.timestamp,
    previousHash: block.previousHash,
    protocolVersion: block.protocolVersion,
    creatorId: block.creatorId,
    purpose: block.purpose,
    identityType: block.identityType,
    hashAlgorithm: block.hashAlgorithm,
    signatureScheme: block.signatureScheme,
  });
}

export function blockCanonical(block: Block): string {
  return JSON.stringify({
    blockNumber: block.blockNumber,
    chainId: block.chainId,
    content: block.content,
    timestamp: block.timestamp,
    previousHash: block.previousHash,
    protocolVersion: block.protocolVersion,
  });
}
```

### packages/core/src/block/inspect.ts

```typescript
import type { Block, GenesisBlock } from "../schema/block.js";
import { hashBlock } from "../crypto/hash.js";
import type { GloryChainError, Result } from "../schema/errors.js";
import { genesisCanonical, blockCanonical } from "./canonical.js";

export type BlockInspection =
  | { type: "genesis"; block: GenesisBlock }
  | { type: "block"; block: Block };

export function isGenesisBlock(
  block: Block | GenesisBlock,
): block is GenesisBlock {
  return block.blockNumber === 0;
}

export function inspectBlock(block: Block | GenesisBlock): BlockInspection {
  if (isGenesisBlock(block)) {
    return { type: "genesis", block };
  }
  return { type: "block", block };
}

export function computeBlockHash(
  block: Block | GenesisBlock,
  algorithm: string,
): Result<string, GloryChainError> {
  const canonical = isGenesisBlock(block)
    ? genesisCanonical(block)
    : blockCanonical(block);
  return hashBlock(canonical, algorithm);
}
```

### packages/core/src/block/index.ts

```typescript
export { blockCanonical, genesisCanonical } from "./canonical.js";
export { computeBlockHash, inspectBlock, isGenesisBlock } from "./inspect.js";
export type { BlockInspection } from "./inspect.js";
```

### packages/core/src/block/canonical.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { generateKeypair } from "../crypto/keygen.js";
import { appendBlock, createChain } from "../chain/index.js";
import { genesisCanonical, blockCanonical } from "./canonical.js";
import type { Block } from "../schema/block.js";

function makeChainWithBlock() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain = createChain(
    { content: "genesis content", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.value.publicKey },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  const r1 = appendBlock(chain.value, { content: "block 1 content", publicKey: kp.value.publicKey }, kp.value.privateKey);
  if (!r1.ok) throw new Error("appendBlock failed");
  return r1.value;
}

describe("genesisCanonical", () => {
  it("returns a string", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    expect(typeof genesisCanonical(genesis)).toBe("string");
  });

  it("is deterministic — same block always produces same output", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    expect(genesisCanonical(genesis)).toBe(genesisCanonical(genesis));
  });

  it("includes all genesis-specific fields", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    const parsed = JSON.parse(genesisCanonical(genesis)) as Record<string, unknown>;
    expect(parsed["blockNumber"]).toBe(0);
    expect(parsed["previousHash"]).toBeNull();
    expect(parsed["creatorId"]).toBe("user1");
    expect(parsed["purpose"]).toBe("test");
    expect(parsed["identityType"]).toBe("anonymous");
  });
});

describe("blockCanonical", () => {
  it("returns a string", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    expect(typeof blockCanonical(block)).toBe("string");
  });

  it("is deterministic", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    expect(blockCanonical(block)).toBe(blockCanonical(block));
  });

  it("includes blockNumber, chainId, content, timestamp, previousHash, protocolVersion", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    const parsed = JSON.parse(blockCanonical(block)) as Record<string, unknown>;
    expect(parsed["blockNumber"]).toBe(1);
    expect(parsed["chainId"]).toBe(chain.metadata.chainId);
    expect(parsed["content"]).toBe("block 1 content");
    expect(typeof parsed["timestamp"]).toBe("string");
    expect(parsed["previousHash"]).toBe(chain.blocks[0]?.hash);
  });

  it("does not include genesis-specific fields", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    const parsed = JSON.parse(blockCanonical(block)) as Record<string, unknown>;
    expect(parsed["creatorId"]).toBeUndefined();
    expect(parsed["purpose"]).toBeUndefined();
  });
});
```

### packages/core/src/block/inspect.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { generateKeypair } from "../crypto/keygen.js";
import { appendBlock, createChain } from "../chain/index.js";
import type { Block } from "../schema/block.js";
import { computeBlockHash, inspectBlock, isGenesisBlock } from "./inspect.js";

function makeChainWithBlock() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain = createChain(
    { content: "genesis", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.value.publicKey },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  const r1 = appendBlock(chain.value, { content: "block 1", publicKey: kp.value.publicKey }, kp.value.privateKey);
  if (!r1.ok) throw new Error("appendBlock failed");
  return r1.value;
}

describe("isGenesisBlock", () => {
  it("returns true for genesis block", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    expect(isGenesisBlock(genesis)).toBe(true);
  });

  it("returns false for non-genesis block", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    expect(isGenesisBlock(block)).toBe(false);
  });
});

describe("inspectBlock", () => {
  it("returns type: genesis for genesis block", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    const inspection = inspectBlock(genesis);
    expect(inspection.type).toBe("genesis");
  });

  it("returns type: block for non-genesis block", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    const inspection = inspectBlock(block);
    expect(inspection.type).toBe("block");
  });

  it("inspection.block matches the input block", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    const inspection = inspectBlock(genesis);
    expect(inspection.block).toBe(genesis);
  });
});

describe("computeBlockHash", () => {
  it("recomputes hash matching block.hash for genesis block", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    const result = computeBlockHash(genesis, genesis.hashAlgorithm);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(genesis.hash);
    }
  });

  it("recomputes hash matching block.hash for non-genesis block", () => {
    const chain = makeChainWithBlock();
    const block = chain.blocks[1] as Block;
    const result = computeBlockHash(block, chain.metadata.hashAlgorithm);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(block.hash);
    }
  });

  it("returns ALGORITHM_UNSUPPORTED for unknown algorithm", () => {
    const chain = makeChainWithBlock();
    const genesis = chain.blocks[0];
    if (!genesis) throw new Error("no genesis");
    const result = computeBlockHash(genesis, "blake3");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALGORITHM_UNSUPPORTED");
    }
  });
});
```

---

## Traceability

| AC | Requirement |
|----|-------------|
| canonicalPayload determinism | FR56 — deterministic hash |
| computeBlockHash | FR3, FR4 — used by verification engine |
| inspectBlock | FR13 — block inspection |
| isGenesisBlock type guard | Architecture — discriminated union narrowing |

---

## Out of Scope

- Full chain verification (Story 2.5)
- CLI formatting of inspection output (Story 4.3)

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
- `packages/core/src/block/canonical.ts`
- `packages/core/src/block/inspect.ts`
- `packages/core/src/block/index.ts`
- `packages/core/src/block/canonical.test.ts`
- `packages/core/src/block/inspect.test.ts`
- `packages/core/src/index.ts` (updated)
