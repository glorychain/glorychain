# Story 2.5 — Verification Engine

**Story ID:** 2.5
**Story Key:** `2-5-verification-engine`
**Epic:** 2 — Core Protocol Library
**Status:** done
**Created:** 2026-03-22

---

## Story

As a developer building on Glory Chain, I want block and chain verification functions in `packages/core/src/verify/`, so that I can detect tampered blocks, broken hash chains, invalid signatures, replay attacks, future timestamps, and duplicate blocks — with specific `ErrorCodeValue` entries in `VerificationResult.errors` identifying exactly what failed.

---

## Background and Context

Story 2.4 delivered `computeBlockHash` and `canonicalPayload`. This story builds the verification engine on top of those utilities plus `verifyBlock` (signing verification from crypto).

**FR3** — `verifyBlock`: verify a single block's hash and signature
**FR4** — `verifyChain`: verify the entire block sequence — hash linkage, signatures, no replays
**FR47** — version-aware verification: check `protocolVersion` is consistent
**FR50** — specific error codes in `VerificationResult.errors`: `INVALID_SIGNATURE`, `BROKEN_CHAIN`, `REPLAY_DETECTED`, `ALGORITHM_UNSUPPORTED`, `FUTURE_TIMESTAMP`, `DUPLICATE_BLOCK`

### What verification checks

**Per-block checks:**
1. Recompute hash from canonical payload → compare to `block.hash` — fail: `BROKEN_CHAIN`
2. Verify signature over canonical payload with `block.publicKey` — fail: `INVALID_SIGNATURE`
3. Timestamp not more than 5 minutes in the future — fail: `FUTURE_TIMESTAMP`

**Chain-level checks (verifyChain):**
4. Each block's `previousHash` equals the hash of the preceding block — fail: `BROKEN_CHAIN`
5. No duplicate block numbers — fail: `DUPLICATE_BLOCK`
6. ChainId consistent across all blocks — fail: `BROKEN_CHAIN`
7. Genesis block has `blockNumber: 0` and `previousHash: null` — fail: `BROKEN_CHAIN`
8. Replay detection: `chainId` in each block's canonical payload matches `chain.metadata.chainId` — this is implicit in signature verification since chainId is in the signed payload (FR12)

`VerificationResult`:
```typescript
{
  valid: boolean;          // true only if errors is empty
  errors: ErrorCodeValue[]; // all errors found across all blocks
  blockCount: number;      // total blocks checked
  lastVerifiedBlock: number; // index of last block that passed all checks (or -1 if none)
}
```

The verifier is non-short-circuiting: it checks every block and collects all errors. `valid` is true only if no errors were found.

---

## Acceptance Criteria

### AC-1: File Structure
- `packages/core/src/verify/verifyBlock.ts`
- `packages/core/src/verify/verifyChain.ts`
- `packages/core/src/verify/index.ts`
- `packages/core/src/verify/verifyBlock.test.ts`
- `packages/core/src/verify/verifyChain.test.ts`

### AC-2: verifyBlock
`verifyBlock(block, hashAlgorithm, signatureScheme): VerificationResult`
- Recomputes hash, checks against `block.hash` — adds `BROKEN_CHAIN` if mismatch
- Verifies signature with `block.publicKey` — adds `INVALID_SIGNATURE` if invalid
- Checks timestamp not more than 5 minutes future — adds `FUTURE_TIMESTAMP` if violated
- Returns `VerificationResult` with `blockCount: 1`, `lastVerifiedBlock: 0` if valid

### AC-3: verifyChain
`verifyChain(chain): VerificationResult`
- Runs per-block checks on every block
- Checks hash linkage between consecutive blocks
- Checks no duplicate blockNumbers
- Checks chainId consistent across all blocks
- Checks genesis is at index 0 with `blockNumber: 0` and `previousHash: null`
- `blockCount` = total blocks in chain
- `lastVerifiedBlock` = index of last block where no errors were introduced (not just the last overall)
- `valid` = `errors.length === 0`

### AC-4: Tests cover all error paths
- Tampered block content → `BROKEN_CHAIN` (hash mismatch)
- Wrong signature (sign with different key) → `INVALID_SIGNATURE`
- Future timestamp → `FUTURE_TIMESTAMP`
- Broken hash chain (modify previousHash) → `BROKEN_CHAIN`
- Duplicate block numbers → `DUPLICATE_BLOCK`
- Valid chain → `valid: true`, empty errors

### AC-5: Full pipeline passes

---

## Tasks

### Task 1: Create packages/core/src/verify/verifyBlock.ts
### Task 2: Create packages/core/src/verify/verifyChain.ts
### Task 3: Create packages/core/src/verify/index.ts
### Task 4: Update packages/core/src/index.ts
### Task 5: Create test files
### Task 6: Run full pipeline

---

## Dev Notes

### Future timestamp threshold

5 minutes = 5 * 60 * 1000 ms. Check: `new Date(block.timestamp).getTime() > Date.now() + 300_000`.

### lastVerifiedBlock tracking

Start at -1. After each block passes all its checks (no new errors introduced for that block), update `lastVerifiedBlock` to that block's index. Track errors per-block: errors before checking block N vs errors after — if no new errors were added, block N passed.

### verifyChain uses chain.metadata for algorithms

`chain.metadata.hashAlgorithm` and `chain.metadata.signatureScheme` are the authoritative algorithm identifiers for all blocks in the chain.

### Duplicate detection

Track seen `blockNumber` values in a `Set<number>`. If already seen, add `DUPLICATE_BLOCK`.

### ChainId consistency

Check `block.chainId === chain.metadata.chainId` for every block. Fail with `BROKEN_CHAIN` if mismatch.

---

## Complete Implementation

### packages/core/src/verify/verifyBlock.ts

```typescript
import { computeBlockHash } from "../block/index.js";
import { blockCanonical, genesisCanonical } from "../block/index.js";
import { verifyBlock as cryptoVerify } from "../crypto/sign.js";
import { isGenesisBlock } from "../block/index.js";
import type { Block, GenesisBlock } from "../schema/block.js";
import { ErrorCode } from "../schema/errors.js";
import type { VerificationResult } from "../schema/verification.js";

const FUTURE_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

export function verifySingleBlock(
  block: Block | GenesisBlock,
  hashAlgorithm: string,
  signatureScheme: string,
): VerificationResult {
  const errors: Array<(typeof ErrorCode)[keyof typeof ErrorCode]> = [];

  // 1. Recompute hash
  const hashResult = computeBlockHash(block, hashAlgorithm);
  if (!hashResult.ok) {
    errors.push(hashResult.error.code);
  } else if (hashResult.value !== block.hash) {
    errors.push(ErrorCode.BROKEN_CHAIN);
  }

  // 2. Verify signature
  const canonical = isGenesisBlock(block)
    ? genesisCanonical(block)
    : blockCanonical(block);
  const sigResult = cryptoVerify(canonical, block.signature, block.publicKey, signatureScheme);
  if (!sigResult.ok) {
    errors.push(sigResult.error.code);
  } else if (!sigResult.value) {
    errors.push(ErrorCode.INVALID_SIGNATURE);
  }

  // 3. Future timestamp check
  const blockTime = new Date(block.timestamp).getTime();
  if (blockTime > Date.now() + FUTURE_TIMESTAMP_TOLERANCE_MS) {
    errors.push(ErrorCode.FUTURE_TIMESTAMP);
  }

  return {
    valid: errors.length === 0,
    errors,
    blockCount: 1,
    lastVerifiedBlock: errors.length === 0 ? 0 : -1,
  };
}
```

### packages/core/src/verify/verifyChain.ts

```typescript
import { computeBlockHash, isGenesisBlock } from "../block/index.js";
import { blockCanonical, genesisCanonical } from "../block/index.js";
import { verifyBlock as cryptoVerify } from "../crypto/sign.js";
import type { Chain } from "../schema/chain.js";
import { ErrorCode } from "../schema/errors.js";
import type { ErrorCodeValue } from "../schema/errors.js";
import type { VerificationResult } from "../schema/verification.js";

const FUTURE_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

export function verifyChain(chain: Chain): VerificationResult {
  const { blocks, metadata } = chain;
  const { hashAlgorithm, signatureScheme, chainId } = metadata;
  const allErrors: ErrorCodeValue[] = [];
  let lastVerifiedBlock = -1;
  const seenBlockNumbers = new Set<number>();

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block === undefined) continue;
    const errorsBeforeThisBlock = allErrors.length;

    // Duplicate block number check
    if (seenBlockNumbers.has(block.blockNumber)) {
      allErrors.push(ErrorCode.DUPLICATE_BLOCK);
    }
    seenBlockNumbers.add(block.blockNumber);

    // ChainId consistency
    if (block.chainId !== chainId) {
      allErrors.push(ErrorCode.BROKEN_CHAIN);
    }

    // Genesis-specific checks (index 0)
    if (i === 0) {
      if (!isGenesisBlock(block)) {
        allErrors.push(ErrorCode.BROKEN_CHAIN);
      } else if (block.previousHash !== null) {
        allErrors.push(ErrorCode.BROKEN_CHAIN);
      }
    }

    // Hash linkage check (non-genesis: previousHash must match prior block's hash)
    if (i > 0) {
      const prevBlock = blocks[i - 1];
      if (prevBlock && block.previousHash !== prevBlock.hash) {
        allErrors.push(ErrorCode.BROKEN_CHAIN);
      }
    }

    // Recompute hash
    const hashResult = computeBlockHash(block, hashAlgorithm);
    if (!hashResult.ok) {
      allErrors.push(hashResult.error.code);
    } else if (hashResult.value !== block.hash) {
      allErrors.push(ErrorCode.BROKEN_CHAIN);
    }

    // Verify signature
    const canonical = isGenesisBlock(block)
      ? genesisCanonical(block)
      : blockCanonical(block);
    const sigResult = cryptoVerify(canonical, block.signature, block.publicKey, signatureScheme);
    if (!sigResult.ok) {
      allErrors.push(sigResult.error.code);
    } else if (!sigResult.value) {
      allErrors.push(ErrorCode.INVALID_SIGNATURE);
    }

    // Future timestamp
    if (new Date(block.timestamp).getTime() > Date.now() + FUTURE_TIMESTAMP_TOLERANCE_MS) {
      allErrors.push(ErrorCode.FUTURE_TIMESTAMP);
    }

    // If no new errors for this block, it passed
    if (allErrors.length === errorsBeforeThisBlock) {
      lastVerifiedBlock = i;
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    blockCount: blocks.length,
    lastVerifiedBlock,
  };
}
```

### packages/core/src/verify/index.ts

```typescript
export { verifySingleBlock } from "./verifyBlock.js";
export { verifyChain } from "./verifyChain.js";
```

---

## Test Implementations

### packages/core/src/verify/verifyBlock.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { generateKeypair } from "../crypto/keygen.js";
import { createChain } from "../chain/create.js";
import { verifySingleBlock } from "./verifyBlock.js";

function makeGenesis() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain = createChain(
    { content: "hello", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.value.publicKey },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  return { genesis: chain.value.blocks[0]!, metadata: chain.value.metadata };
}

describe("verifySingleBlock", () => {
  it("valid genesis block passes verification", () => {
    const { genesis, metadata } = makeGenesis();
    const result = verifySingleBlock(genesis, metadata.hashAlgorithm, metadata.signatureScheme);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.blockCount).toBe(1);
    expect(result.lastVerifiedBlock).toBe(0);
  });

  it("tampered content causes BROKEN_CHAIN", () => {
    const { genesis, metadata } = makeGenesis();
    const tampered = { ...genesis, content: "tampered" };
    const result = verifySingleBlock(tampered, metadata.hashAlgorithm, metadata.signatureScheme);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("BROKEN_CHAIN");
  });

  it("tampered hash causes BROKEN_CHAIN", () => {
    const { genesis, metadata } = makeGenesis();
    const tampered = { ...genesis, hash: "a".repeat(64) };
    const result = verifySingleBlock(tampered, metadata.hashAlgorithm, metadata.signatureScheme);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("BROKEN_CHAIN");
  });

  it("tampered signature causes INVALID_SIGNATURE", () => {
    const { genesis, metadata } = makeGenesis();
    const tampered = { ...genesis, signature: "invalidsignature" };
    const result = verifySingleBlock(tampered, metadata.hashAlgorithm, metadata.signatureScheme);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("INVALID_SIGNATURE");
  });
});
```

### packages/core/src/verify/verifyChain.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { appendBlock, createChain } from "../chain/index.js";
import { generateKeypair } from "../crypto/keygen.js";
import type { Block, GenesisBlock } from "../schema/block.js";
import type { Chain } from "../schema/chain.js";
import { verifyChain } from "./verifyChain.js";

function makeChainWithBlocks(n = 2) {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  let chain = createChain(
    { content: "genesis", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.value.publicKey },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  for (let i = 0; i < n - 1; i++) {
    const r = appendBlock(chain.value, { content: `block ${i + 1}`, publicKey: kp.value.publicKey }, kp.value.privateKey);
    if (!r.ok) throw new Error("appendBlock failed");
    chain = r;
  }
  return chain.value;
}

describe("verifyChain", () => {
  it("valid chain passes verification", () => {
    const chain = makeChainWithBlocks(3);
    const result = verifyChain(chain);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.blockCount).toBe(3);
    expect(result.lastVerifiedBlock).toBe(2);
  });

  it("single genesis chain passes", () => {
    const chain = makeChainWithBlocks(1);
    const result = verifyChain(chain);
    expect(result.valid).toBe(true);
    expect(result.blockCount).toBe(1);
  });

  it("tampered block content causes BROKEN_CHAIN", () => {
    const chain = makeChainWithBlocks(2);
    const tampered: Chain = {
      ...chain,
      blocks: [
        chain.blocks[0] as GenesisBlock,
        { ...(chain.blocks[1] as Block), content: "tampered" },
      ],
    };
    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("BROKEN_CHAIN");
  });

  it("broken previousHash chain causes BROKEN_CHAIN", () => {
    const chain = makeChainWithBlocks(2);
    const tampered: Chain = {
      ...chain,
      blocks: [
        chain.blocks[0] as GenesisBlock,
        { ...(chain.blocks[1] as Block), previousHash: "a".repeat(64) },
      ],
    };
    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("BROKEN_CHAIN");
  });

  it("duplicate block numbers cause DUPLICATE_BLOCK", () => {
    const chain = makeChainWithBlocks(2);
    // Force duplicate by setting block[1].blockNumber = 0
    const tampered: Chain = {
      ...chain,
      blocks: [
        chain.blocks[0] as GenesisBlock,
        { ...(chain.blocks[1] as Block), blockNumber: 0 },
      ],
    };
    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("DUPLICATE_BLOCK");
  });

  it("blockCount equals chain length", () => {
    const chain = makeChainWithBlocks(5);
    const result = verifyChain(chain);
    expect(result.blockCount).toBe(5);
  });
});
```

---

## Traceability

| AC | Requirement |
|----|-------------|
| verifySingleBlock hash check | FR3 |
| verifySingleBlock signature check | FR3 |
| verifyChain hash linkage | FR4 |
| FUTURE_TIMESTAMP | FR50 |
| DUPLICATE_BLOCK | FR50 |
| BROKEN_CHAIN | FR50 |
| INVALID_SIGNATURE | FR50 |
| ChainId in signature payload | FR12 — replay prevention |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
- `packages/core/src/verify/verifyBlock.ts`
- `packages/core/src/verify/verifyChain.ts`
- `packages/core/src/verify/index.ts`
- `packages/core/src/verify/verifyBlock.test.ts`
- `packages/core/src/verify/verifyChain.test.ts`
- `packages/core/src/index.ts` (updated)
