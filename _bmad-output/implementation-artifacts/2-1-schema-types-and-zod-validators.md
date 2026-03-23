# Story 2.1 — Schema Types and Zod Validators

**Story ID:** 2.1
**Story Key:** `2-1-schema-types-and-zod-validators`
**Epic:** 2 — Core Package Foundation
**Status:** done
**Created:** 2026-03-22

---

## Story

As a developer building on Glory Chain, I want a complete, stable set of TypeScript types and interfaces for every domain object in the protocol — `Block`, `GenesisBlock`, `ForkGenesisBlock`, `ChainMetadata`, `VerificationResult`, `Connector`, `ErrorCode`, `GloryChainError`, and `Result<T,E>` — exported from `@glory-chain/core`, so that I can build against a typed, dependency-free contract with confidence that the shapes match the published spec.

---

## Background and Context

This is the first story in Epic 2, which builds out `packages/core`. Epic 1 delivered the full monorepo scaffold, the `packages/core` stub (with `package.json` and `tsconfig.json` but no `src/`), and the `packages/shared` Zod validators for web form input.

This story draws a critical architectural distinction:

- **`packages/shared`** — Zod schemas for runtime validation at web API/form boundaries. Zod IS a runtime dependency there and that is intentional.
- **`packages/core`** — pure TypeScript types and interfaces. Zero runtime dependencies (NFR14). No Zod in the bundle output. The `Connector` interface, `Block`, `GenesisBlock`, etc. are TypeScript types only — the bundler must produce a dist with no external imports.

The architecture document (section: Connector Interface Pattern) defines the `Connector` interface shape. The PRD (section: API Backend — Data Schemas & Contracts) defines all block and chain schemas. This story makes those definitions concrete and testable.

---

## Acceptance Criteria

### AC-1: File Structure Created
All schema files exist at the correct paths under `packages/core/src/schema/`:
- `packages/core/src/schema/block.ts`
- `packages/core/src/schema/chain.ts`
- `packages/core/src/schema/errors.ts`
- `packages/core/src/schema/verification.ts`
- `packages/core/src/schema/block.test.ts`
- `packages/core/src/schema/errors.test.ts`
- `packages/core/src/index.ts`
- `packages/core/tsdown.config.ts`
- `packages/core/vitest.config.ts`

### AC-2: All Types Exported Correctly
`packages/core/src/index.ts` exports every public type and interface. No internal implementation paths are exposed. Consumer can do:
```typescript
import type { Block, GenesisBlock, ForkGenesisBlock, ChainMetadata, VerificationResult, Connector, ThreatEvent, ErrorCode, GloryChainError } from '@glory-chain/core'
import type { Result } from '@glory-chain/core'
```

### AC-3: Block Types Complete and Correct
- `Block` has all required fields: `blockNumber`, `chainId`, `content`, `timestamp`, `previousHash`, `hash`, `signature`, `publicKey`, `protocolVersion`
- `GenesisBlock` extends `Block` with `blockNumber: 0` (literal type), adds `creatorId`, `purpose`, `identityType`, `hashAlgorithm`, `signatureScheme`, and the reserved `externalAnchor` field (optional)
- `ForkGenesisBlock` extends `GenesisBlock` with `forkOf`, `forkFromBlock`, `forkSourceBlockHash`, and optional `forkReason`
- `protocolVersion` is present on every block type (FR14)
- `externalAnchor` is reserved in genesis schema (FR59) — optional, schema-only, not verified

### AC-4: ChainMetadata Type Complete
`ChainMetadata` has all required fields: `chainId`, `createdAt`, `protocolVersion`, `hashAlgorithm`, `signatureScheme`, `migrationHistory`, `knownForks`, `transferHistory`. Supporting types `MigrationEvent`, `ForkReference`, `TransferEvent` are defined.

### AC-5: Connector Interface Complete
`Connector` interface defined with correct method signatures. `watch()` returns `AsyncIterable<ThreatEvent>` (not `AsyncIterator`). `ThreatEvent` type is defined with `type`, `chainId`, `timestamp`, and optional `detail` fields. `version` string property present.

### AC-6: Error Types Complete
- `ErrorCode` is a `const` object (not a string enum) with all 8 error codes from the PRD: `INVALID_SIGNATURE`, `BROKEN_CHAIN`, `REPLAY_DETECTED`, `ALGORITHM_UNSUPPORTED`, `CHAIN_NOT_FOUND`, `KEY_MISMATCH`, `FUTURE_TIMESTAMP`, `DUPLICATE_BLOCK`
- `ErrorCode` values are exported as a type union via `type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]`
- `GloryChainError` has `code: ErrorCodeValue`, `message: string`, and optional `blockNumber: number`
- `Result<T, E>` generic is `{ ok: true; value: T } | { ok: false; error: E }` with default `E = GloryChainError`

### AC-7: VerificationResult Type Complete
`VerificationResult` has `valid: boolean`, `errors: ErrorCodeValue[]`, `blockCount: number`, `lastVerifiedBlock: number`.

### AC-8: Zero Runtime Dependencies
After `pnpm turbo build --filter=@glory-chain/core`:
- `packages/core/dist/index.js` contains no `import` statements referencing external packages
- Running `node -e "import('./packages/core/dist/index.js')"` from the monorepo root completes without errors
- `packages/core/package.json` has no `dependencies` key (only `devDependencies`)

### AC-9: TypeScript Checks Pass
`pnpm turbo typecheck --filter=@glory-chain/core` exits 0. No `any` types. All imports use `import type` for type-only imports (required by `verbatimModuleSyntax: true`).

### AC-10: Tests Pass
`pnpm turbo test --filter=@glory-chain/core` exits 0. Type-level tests using `expectTypeOf` verify the structural correctness of `Result<T,E>`, discriminated union narrowing, and `ErrorCode` const values.

### AC-11: Turbo Pipeline Passes
`pnpm turbo build test typecheck lint --filter=@glory-chain/core` exits 0.

---

## Tasks

### Task 1: Create vitest.config.ts
Create `packages/core/vitest.config.ts`.

### Task 2: Create tsdown.config.ts
Create `packages/core/tsdown.config.ts` with ESM output, entry point `src/index.ts`, external dependency check enforced.

### Task 3: Create packages/core/src/schema/errors.ts
Implement `ErrorCode`, `ErrorCodeValue`, `GloryChainError`, `Result<T,E>`.

### Task 4: Create packages/core/src/schema/verification.ts
Implement `VerificationResult`.

### Task 5: Create packages/core/src/schema/block.ts
Implement `Block`, `GenesisBlock`, `ForkGenesisBlock`. Include `ExternalAnchor` type for the reserved field.

### Task 6: Create packages/core/src/schema/chain.ts
Implement `ChainMetadata`, `MigrationEvent`, `ForkReference`, `TransferEvent`, `ThreatEvent`, `Connector` interface, `Chain` type.

### Task 7: Create packages/core/src/index.ts
Export all public types from schema files.

### Task 8: Create packages/core/src/schema/block.test.ts
Type-level tests for block types.

### Task 9: Create packages/core/src/schema/errors.test.ts
Type-level tests for Result<T,E> and ErrorCode.

### Task 10: Verify build produces zero-dep bundle
Run `pnpm turbo build --filter=@glory-chain/core` and confirm dist output.

### Task 11: Run full pipeline
`pnpm turbo build test typecheck lint --filter=@glory-chain/core` — all green.

---

## Dev Notes

### Critical Constraint: Zero Runtime Dependencies

`packages/core/package.json` must have **no `dependencies` key at all** — only `devDependencies`. The tsdown build must output ESM with zero external imports. This is enforced by NFR14 and is an architectural invariant for the entire project. Any attempt to `import` a non-built-in module in any file under `packages/core/src/` that ends up in the bundle is a build failure.

The architecture document states explicitly:
> **Never:** Add runtime dependencies to `@glory-chain/core`

This means: no Zod, no fast-check, no anything in the bundle. Tests (`.test.ts` files) may import from `vitest` because test files are never bundled. `fast-check` is a devDependency used only in `.test.ts` and `.property.test.ts` files.

### verbatimModuleSyntax

`tsconfig.base.json` sets `"verbatimModuleSyntax": true`. This means every import that is type-only **must** use `import type`. Failing to do this causes a TypeScript error. All cross-file imports within `packages/core/src/schema/` must use `import type` syntax.

Example:
```typescript
// CORRECT
import type { ErrorCodeValue } from './errors.js'

// WRONG — will fail with verbatimModuleSyntax
import { ErrorCodeValue } from './errors.js'
```

### Import Extensions

With `"moduleResolution": "bundler"` in `tsconfig.base.json`, TypeScript resolves `.js` extensions in imports even when the source file is `.ts`. Always use `.js` extensions in relative imports within `packages/core/src/`:

```typescript
import type { ErrorCodeValue } from './errors.js'
```

### Const Object vs String Enum for ErrorCode

Use a `const` object, not a TypeScript `enum`. String enums have runtime footprint and non-standard type narrowing behavior. The const + `typeof` pattern is idiomatic modern TypeScript:

```typescript
export const ErrorCode = {
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  BROKEN_CHAIN: 'BROKEN_CHAIN',
  // ...
} as const

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]
```

This produces a value that is usable as a typed constant at runtime AND as a union type at compile time, with zero overhead.

### watch() Returns AsyncIterable, Not AsyncIterator

The architecture document contains a note that `watch()` uses `AsyncIterator<ThreatEvent>` in the interface snippet, but the story prompt specifies `AsyncIterable<ThreatEvent>`. Use `AsyncIterable<ThreatEvent>` — this is the correct choice for a method that callers will use with `for await...of`. `AsyncIterator` is the lower-level protocol; `AsyncIterable` is the standard public-facing API.

```typescript
interface Connector {
  version: string
  read(chainId: string): Promise<Chain>
  write(chain: Chain): Promise<void>
  watch(chainId: string): AsyncIterable<ThreatEvent>
  migrate(chainId: string, target: Connector): Promise<void>
  verify(chainId: string): Promise<VerificationResult>
}
```

### GenesisBlock blockNumber Literal Type

`GenesisBlock` extends `Block` but overrides `blockNumber` to the literal type `0`. This is a discriminated union discriminant — it allows TypeScript to narrow a `Block | GenesisBlock` union by checking `blockNumber === 0`.

```typescript
export interface GenesisBlock extends Omit<Block, 'blockNumber' | 'previousHash'> {
  blockNumber: 0
  previousHash: null   // genesis has no previous block
  // ...
}
```

### ForkGenesisBlock Source Block Hash

The PRD `ForkGenesisBlock` interface names the fields `forkOf` and `forkFromBlock`. Add `forkSourceBlockHash: string` as well — the fork genesis must record the hash of the block it forked from (not just the block number), because block numbers are mutable references while hashes are content-addressable identifiers. This is consistent with the verification determinism requirement.

### externalAnchor Reserved Field

From the PRD (FR59 schema note):
> The genesis block schema reserves `externalAnchor?: { chainType: string, blockHash: string, blockHeight: number, networkId: string }`

Define this as a standalone type and use it as an optional field on `GenesisBlock`. The field is stored and surfaced by `glory-chain inspect` but not verified until Phase 3.

### Chain Type

The `Connector` interface methods take and return `Chain`. Define `Chain` as:
```typescript
export interface Chain {
  metadata: ChainMetadata
  blocks: [GenesisBlock, ...Block[]]  // tuple: genesis is always first, followed by zero or more regular blocks
}
```

The tuple type `[GenesisBlock, ...Block[]]` encodes at the type level that a chain always has exactly one genesis block at index 0. This is a protocol invariant.

### ISO8601 Type Alias

Use a branded string type for ISO 8601 timestamps to prevent accidental assignment of arbitrary strings:
```typescript
export type ISO8601 = string & { readonly __iso8601: unique symbol }
```

All timestamp fields (`createdAt`, `timestamp`) use `ISO8601`.

---

## Complete Type Definitions

The developer must implement exactly these types. Copy these definitions directly — do not invent alternative field names.

### packages/core/src/schema/errors.ts

```typescript
// ErrorCode — const object (not enum) for zero bundle overhead and correct type narrowing
export const ErrorCode = {
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  BROKEN_CHAIN: 'BROKEN_CHAIN',
  REPLAY_DETECTED: 'REPLAY_DETECTED',
  ALGORITHM_UNSUPPORTED: 'ALGORITHM_UNSUPPORTED',
  CHAIN_NOT_FOUND: 'CHAIN_NOT_FOUND',
  KEY_MISMATCH: 'KEY_MISMATCH',
  FUTURE_TIMESTAMP: 'FUTURE_TIMESTAMP',
  DUPLICATE_BLOCK: 'DUPLICATE_BLOCK',
} as const

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]

export interface GloryChainError {
  code: ErrorCodeValue
  message: string
  blockNumber?: number   // which block triggered the error, if applicable
}

// Result<T, E> — discriminated union. Default E = GloryChainError.
// Use ok: true to access value; ok: false to access error.
// Never throw for expected errors — return Result instead.
export type Result<T, E = GloryChainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }
```

### packages/core/src/schema/verification.ts

```typescript
import type { ErrorCodeValue } from './errors.js'

export interface VerificationResult {
  valid: boolean
  errors: ErrorCodeValue[]
  blockCount: number
  lastVerifiedBlock: number  // 0-based index of last successfully verified block
}
```

### packages/core/src/schema/block.ts

```typescript
// ISO 8601 branded string — prevents accidental assignment of arbitrary strings to timestamp fields
export type ISO8601 = string & { readonly __iso8601: unique symbol }

// ExternalAnchor — reserved in genesis schema for Phase 3 (FR59)
// Field is stored and surfaced by `glory-chain inspect` but NOT verified until Phase 3
export interface ExternalAnchor {
  chainType: string      // e.g. 'bitcoin', 'ethereum'
  blockHash: string      // block hash on the external chain
  blockHeight: number    // block height on the external chain
  networkId: string      // e.g. 'mainnet', 'testnet'
}

// Block — a standard (non-genesis) block in a chain
export interface Block {
  blockNumber: number        // 1-based for non-genesis blocks (genesis is 0)
  chainId: string            // UUID v4 — included in signature for replay attack prevention (FR12)
  content: string            // arbitrary UTF-8 content payload
  timestamp: ISO8601         // ISO 8601 — when this block was created
  previousHash: string       // lowercase hex SHA-256 of the preceding block
  hash: string               // lowercase hex SHA-256 of this block's canonical payload
  signature: string          // base64url-encoded signature over: chainId + blockNumber + content + previousHash
  publicKey: string          // base64url-encoded public key that signed this block
  protocolVersion: string    // protocol version at time of block creation (FR14)
}

// GenesisBlock — the first block (blockNumber: 0) in any chain
// Extends Block but:
//   - blockNumber is the literal type 0 (discriminant for narrowing)
//   - previousHash is null (no preceding block)
//   - adds genesis-specific fields
export interface GenesisBlock extends Omit<Block, 'blockNumber' | 'previousHash'> {
  blockNumber: 0                           // literal type — discriminates GenesisBlock from Block
  previousHash: null                       // genesis has no previous block
  creatorId: string                        // declared identity — optional validation by caller; not verified by platform
  purpose: string                          // the chain's declared purpose (genesis statement)
  identityType: 'oauth' | 'external' | 'anonymous'
  hashAlgorithm: string                    // hash algorithm used for this chain (default: 'sha256')
  signatureScheme: string                  // signature scheme used (default: 'ed25519')
  externalAnchor?: ExternalAnchor          // reserved — FR59; schema-only in MVP 1
}

// ForkGenesisBlock — genesis block for a forked chain
// Carries provenance reference to the original chain and fork point
export interface ForkGenesisBlock extends GenesisBlock {
  forkOf: string               // chainId of the original chain this was forked from
  forkFromBlock: number        // block number on the original chain at which fork diverges
  forkSourceBlockHash: string  // hash of the source block (content-addressable reference — not just the number)
  forkReason?: string          // optional human-readable reason, e.g. 'maintainer key compromised'
}
```

### packages/core/src/schema/chain.ts

```typescript
import type { ISO8601 } from './block.js'
import type { VerificationResult } from './verification.js'

// MigrationEvent — recorded permanently when a chain moves between connectors (FR6)
// Every migration is a provenance scar — stored in ChainMetadata, never deleted
export interface MigrationEvent {
  fromConnector: string    // connector identifier, e.g. 'fs', 'github'
  toConnector: string      // connector identifier
  timestamp: ISO8601
  reason?: string
}

// ForkReference — recorded on the original chain when a fork is created (FR53)
export interface ForkReference {
  forkChainId: string        // chainId of the fork
  forkFromBlock: number      // block number where the fork diverges
  forkSourceBlockHash: string
  createdAt: ISO8601
}

// TransferEvent — reserved for Phase 3 ownership transfer (FR39)
// Present as an empty array in MVP to preserve schema stability
export interface TransferEvent {
  fromIdentity: string
  toIdentity: string
  timestamp: ISO8601
  reason?: string
}

// ChainMetadata — stored alongside blocks, not embedded in blocks
export interface ChainMetadata {
  chainId: string                        // UUID v4
  createdAt: ISO8601
  protocolVersion: string                // protocol version at chain creation
  hashAlgorithm: string                  // e.g. 'sha256' — applies to all blocks in the chain
  signatureScheme: string                // e.g. 'ed25519' — applies to all blocks in the chain
  migrationHistory: MigrationEvent[]    // provenance scar — ordered list of all migrations
  knownForks: ForkReference[]            // forks created from this chain (FR53)
  transferHistory: TransferEvent[]       // reserved: always [] in MVP (FR39)
}

// ThreatEvent — emitted by Connector.watch() when the persistence environment shows anomalies
export type ThreatEventType =
  | 'CHAIN_NOT_FOUND'        // chain storage missing entirely
  | 'BLOCK_MODIFIED'         // block content changed after write
  | 'REPO_MADE_PRIVATE'      // GitHub connector: repo visibility changed
  | 'REPO_DELETED'           // GitHub connector: repo deleted
  | 'FILE_MISSING'           // fs connector: chain file missing
  | 'FILE_MODIFIED'          // fs connector: chain file modified outside protocol
  | 'UNEXPECTED_ERROR'       // connector-specific unexpected failure

export interface ThreatEvent {
  type: ThreatEventType
  chainId: string
  timestamp: ISO8601
  detail?: string    // connector-specific detail message
}

// Chain — the complete in-memory representation of a chain
// blocks is a tuple: genesis block always at index 0, followed by zero or more standard blocks
import type { GenesisBlock, Block } from './block.js'

export interface Chain {
  metadata: ChainMetadata
  blocks: [GenesisBlock, ...Block[]]
}

// Connector — the versioned public API contract for persistence plugins (FR20, NFR20)
// All connector packages (@glory-chain/fs, @glory-chain/github) implement this interface
// Breaking changes to this interface require an RFC
export interface Connector {
  version: string                                                    // connector implementation version
  read(chainId: string): Promise<Chain>
  write(chain: Chain): Promise<void>                                 // idempotent — writing same chain twice is safe
  watch(chainId: string): AsyncIterable<ThreatEvent>                // never throws — emits errors as ThreatEvent
  migrate(chainId: string, target: Connector): Promise<void>
  verify(chainId: string): Promise<VerificationResult>
}
```

### packages/core/src/index.ts

```typescript
// @glory-chain/core — public API surface
// All consumers import from '@glory-chain/core' only — never from internal paths

// Block types
export type { ISO8601, ExternalAnchor, Block, GenesisBlock, ForkGenesisBlock } from './schema/block.js'

// Chain types
export type {
  MigrationEvent,
  ForkReference,
  TransferEvent,
  ChainMetadata,
  ThreatEventType,
  ThreatEvent,
  Chain,
  Connector,
} from './schema/chain.js'

// Error types
export { ErrorCode } from './schema/errors.js'
export type { ErrorCodeValue, GloryChainError, Result } from './schema/errors.js'

// Verification types
export type { VerificationResult } from './schema/verification.js'
```

Note: `ErrorCode` (the const object) is a value export, not a type export. All other exports are type-only. This is correct — `ErrorCode` needs to be a runtime value so callers can do `ErrorCode.INVALID_SIGNATURE`.

### packages/core/tsdown.config.ts

```typescript
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // Zero external dependencies — any external import in the bundle is a build error
  // @glory-chain/core must ship as pure TypeScript type declarations + minimal ESM
  // No noExternal needed since there are no dependencies to bundle
  sourcemap: true,
})
```

### packages/core/vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
})
```

### packages/core/src/schema/block.test.ts

```typescript
import { describe, it, expectTypeOf } from 'vitest'
import type { Block, GenesisBlock, ForkGenesisBlock, ISO8601, ExternalAnchor } from './block.js'

describe('Block types', () => {
  it('Block has all required fields with correct types', () => {
    expectTypeOf<Block['blockNumber']>().toEqualTypeOf<number>()
    expectTypeOf<Block['chainId']>().toEqualTypeOf<string>()
    expectTypeOf<Block['content']>().toEqualTypeOf<string>()
    expectTypeOf<Block['timestamp']>().toEqualTypeOf<ISO8601>()
    expectTypeOf<Block['previousHash']>().toEqualTypeOf<string>()
    expectTypeOf<Block['hash']>().toEqualTypeOf<string>()
    expectTypeOf<Block['signature']>().toEqualTypeOf<string>()
    expectTypeOf<Block['publicKey']>().toEqualTypeOf<string>()
    expectTypeOf<Block['protocolVersion']>().toEqualTypeOf<string>()
  })

  it('GenesisBlock blockNumber is literal type 0', () => {
    expectTypeOf<GenesisBlock['blockNumber']>().toEqualTypeOf<0>()
  })

  it('GenesisBlock previousHash is null', () => {
    expectTypeOf<GenesisBlock['previousHash']>().toEqualTypeOf<null>()
  })

  it('GenesisBlock has genesis-specific fields', () => {
    expectTypeOf<GenesisBlock['purpose']>().toEqualTypeOf<string>()
    expectTypeOf<GenesisBlock['creatorId']>().toEqualTypeOf<string>()
    expectTypeOf<GenesisBlock['hashAlgorithm']>().toEqualTypeOf<string>()
    expectTypeOf<GenesisBlock['signatureScheme']>().toEqualTypeOf<string>()
    expectTypeOf<GenesisBlock['identityType']>().toEqualTypeOf<'oauth' | 'external' | 'anonymous'>()
  })

  it('GenesisBlock externalAnchor is optional', () => {
    expectTypeOf<GenesisBlock['externalAnchor']>().toEqualTypeOf<ExternalAnchor | undefined>()
  })

  it('ForkGenesisBlock extends GenesisBlock with fork fields', () => {
    expectTypeOf<ForkGenesisBlock['forkOf']>().toEqualTypeOf<string>()
    expectTypeOf<ForkGenesisBlock['forkFromBlock']>().toEqualTypeOf<number>()
    expectTypeOf<ForkGenesisBlock['forkSourceBlockHash']>().toEqualTypeOf<string>()
    expectTypeOf<ForkGenesisBlock['forkReason']>().toEqualTypeOf<string | undefined>()
  })

  it('GenesisBlock is assignable to Block union via blockNumber discriminant', () => {
    // A function that takes Block | GenesisBlock can narrow by blockNumber
    type BlockOrGenesis = Block | GenesisBlock
    type NarrowedGenesis = Extract<BlockOrGenesis, { blockNumber: 0 }>
    expectTypeOf<NarrowedGenesis>().toEqualTypeOf<GenesisBlock>()
  })
})
```

### packages/core/src/schema/errors.test.ts

```typescript
import { describe, it, expect, expectTypeOf } from 'vitest'
import { ErrorCode } from './errors.js'
import type { ErrorCodeValue, GloryChainError, Result } from './errors.js'

describe('ErrorCode', () => {
  it('is a const object with all 8 error codes', () => {
    expect(ErrorCode.INVALID_SIGNATURE).toBe('INVALID_SIGNATURE')
    expect(ErrorCode.BROKEN_CHAIN).toBe('BROKEN_CHAIN')
    expect(ErrorCode.REPLAY_DETECTED).toBe('REPLAY_DETECTED')
    expect(ErrorCode.ALGORITHM_UNSUPPORTED).toBe('ALGORITHM_UNSUPPORTED')
    expect(ErrorCode.CHAIN_NOT_FOUND).toBe('CHAIN_NOT_FOUND')
    expect(ErrorCode.KEY_MISMATCH).toBe('KEY_MISMATCH')
    expect(ErrorCode.FUTURE_TIMESTAMP).toBe('FUTURE_TIMESTAMP')
    expect(ErrorCode.DUPLICATE_BLOCK).toBe('DUPLICATE_BLOCK')
  })

  it('ErrorCode object has exactly 8 keys', () => {
    expect(Object.keys(ErrorCode).length).toBe(8)
  })
})

describe('GloryChainError', () => {
  it('has correct field types', () => {
    expectTypeOf<GloryChainError['code']>().toEqualTypeOf<ErrorCodeValue>()
    expectTypeOf<GloryChainError['message']>().toEqualTypeOf<string>()
    expectTypeOf<GloryChainError['blockNumber']>().toEqualTypeOf<number | undefined>()
  })
})

describe('Result<T, E>', () => {
  it('ok: true branch has value, not error', () => {
    type OkResult = Extract<Result<string>, { ok: true }>
    expectTypeOf<OkResult['value']>().toEqualTypeOf<string>()
    // @ts-expect-error — ok: true branch has no 'error' field
    type _ShouldFail = OkResult['error']
  })

  it('ok: false branch has error, not value', () => {
    type ErrResult = Extract<Result<string>, { ok: false }>
    expectTypeOf<ErrResult['error']>().toEqualTypeOf<GloryChainError>()
    // @ts-expect-error — ok: false branch has no 'value' field
    type _ShouldFail = ErrResult['value']
  })

  it('Result defaults E to GloryChainError', () => {
    type DefaultErr = Extract<Result<number>, { ok: false }>
    expectTypeOf<DefaultErr['error']>().toEqualTypeOf<GloryChainError>()
  })

  it('Result<T, E> accepts custom error type', () => {
    type CustomError = { kind: 'custom'; detail: string }
    type CustomResult = Result<number, CustomError>
    type ErrBranch = Extract<CustomResult, { ok: false }>
    expectTypeOf<ErrBranch['error']>().toEqualTypeOf<CustomError>()
  })

  it('narrows correctly in if/else', () => {
    // This is a compile-time test — if Result is wrong this will not compile
    function test(r: Result<string>): string {
      if (r.ok) {
        return r.value.toUpperCase()  // value accessible here
      }
      return r.error.code             // error accessible here
    }
    expectTypeOf(test).toBeFunction()
  })
})
```

---

## Configuration Files

### packages/core/package.json (updated)

The stub `package.json` from Epic 1 already has the correct scripts and devDependencies. Verify the following — no changes needed unless a discrepancy is found:

```json
{
  "name": "@glory-chain/core",
  "version": "0.0.1",
  "type": "module",
  "description": "Glory Chain core protocol library — zero runtime dependencies",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsdown",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "test": "vitest run"
  },
  "devDependencies": {
    "@biomejs/biome": "latest",
    "fast-check": "^4.5.0",
    "tsdown": "latest",
    "typescript": "^5.9.0",
    "vitest": "^4.1.0"
  }
}
```

**Key changes from the Epic 1 stub:**
- `build` script: change from `"test -f src/index.ts && tsdown || true"` → `"tsdown"` (src now exists)
- `typecheck` script: change from `"tsc --noEmit --allowEmptyFiles 2>/dev/null || true"` → `"tsc --noEmit"` (src now exists)
- `test` script: change from `"vitest run --passWithNoTests"` → `"vitest run"` (tests now exist)
- **No `dependencies` key** — only `devDependencies`. The absence of a `dependencies` key enforces the zero-runtime-dep constraint.

---

## Verification Steps

After implementation, manually verify:

1. **Bundle is zero-dep:**
   ```bash
   pnpm turbo build --filter=@glory-chain/core
   # Then inspect:
   cat packages/core/dist/index.js | head -20
   # Expected: no 'import' lines referencing external packages
   # Acceptable: 'export' declarations only (type-only exports may be elided entirely)
   ```

2. **TypeScript passes:**
   ```bash
   pnpm turbo typecheck --filter=@glory-chain/core
   # Expected: exit 0, no errors
   ```

3. **Tests pass:**
   ```bash
   pnpm turbo test --filter=@glory-chain/core
   # Expected: all tests green
   ```

4. **ErrorCode is a proper const (not enum):**
   ```bash
   node --input-type=module <<'EOF'
   import { ErrorCode } from './packages/core/dist/index.js'
   console.log(ErrorCode.INVALID_SIGNATURE === 'INVALID_SIGNATURE') // true
   console.log(typeof ErrorCode)  // 'object'
   EOF
   ```

5. **No internal path leakage:**
   Confirm that `packages/core/src/schema/*.ts` paths are NOT listed in the `exports` field of `packages/core/package.json`. Only `"."` is exported.

---

## Traceability

| Acceptance Criterion | PRD Requirement | Architecture Section |
|---------------------|-----------------|---------------------|
| Block types with protocolVersion | FR14 | Block & Schema |
| GenesisBlock with externalAnchor reserved | FR59 | External Chain Anchoring schema note |
| ForkGenesisBlock provenance fields | FR5, FR52 | Fork & Resilience |
| Connector interface with watch() | FR18, FR20, NFR20 | Connector Interface Pattern |
| ErrorCode 8 codes | FR50 | Error Codes table |
| Result<T,E> pattern | Architecture | Error Handling Patterns |
| Zero runtime deps | NFR14 | Decision Priority Analysis |
| VerificationResult | FR3, FR4, FR50 | API Surface — Core Library |
| ChainMetadata migrationHistory | FR6 | Data Schemas — Core |
| ChainMetadata knownForks | FR53, FR55 | Fork & Resilience |

---

## Out of Scope for This Story

The following are explicitly NOT part of this story:

- Implementation of any chain lifecycle functions (`createChain`, `appendBlock`, `verifyChain`, `forkChain`) — those are Epic 2 stories 2.2+
- Crypto primitives (`hash.ts`, `sign.ts`, `keygen.ts`) — separate story
- Connector implementations (`@glory-chain/fs`, `@glory-chain/github`) — separate epics
- Zod schemas for `Block` or `ChainMetadata` — `packages/core` is pure TypeScript types; Zod lives in `packages/shared` only
- Any SaaS-specific types — those live in `apps/web`
- `fast-check` property-based tests for the schema types (there's nothing to property-test yet — those tests belong with the chain engine functions in later stories)

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
- `packages/core/src/schema/block.ts`
- `packages/core/src/schema/chain.ts`
- `packages/core/src/schema/errors.ts`
- `packages/core/src/schema/verification.ts`
- `packages/core/src/schema/block.test.ts`
- `packages/core/src/schema/errors.test.ts`
- `packages/core/src/index.ts`
- `packages/core/tsdown.config.ts`
- `packages/core/vitest.config.ts`
- `packages/core/package.json` (updated scripts only)
