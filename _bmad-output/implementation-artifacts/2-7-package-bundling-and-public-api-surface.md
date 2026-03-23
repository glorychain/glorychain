# Story 2.7 — Package Bundling and Public API Surface

**Story ID:** 2.7
**Story Key:** `2-7-package-bundling-and-public-api-surface`
**Epic:** 2 — Core Protocol Library
**Status:** done
**Created:** 2026-03-22

---

## Story

As a developer building on Glory Chain, I want `@glory-chain/core` to ship as a publish-ready ESM package with a verified public API surface, zero runtime dependencies, and a bundle under 50 kB, so that downstream packages and SaaS consumers can import from a single stable entry point.

---

## Acceptance Criteria — All Verified

### AC-1: Bundle size ≤ 50 kB ✓
`dist/index.mjs` = 13.78 kB gzip 3.25 kB. Well under budget.

### AC-2: Zero external runtime dependencies ✓
Only import in bundle: `import { ... } from "node:crypto"` — Node.js built-in, not an external package.

### AC-3: All public exports accessible ✓
Verified by node runtime import:
- `ErrorCode`, `PROTOCOL_VERSION`, `CUSTODY_WARNING`
- `createChain`, `appendBlock`, `forkChain`, `migrateChain`, `recordForkOnSource`
- `generateKeypair`, `hashBlock`, `signBlock`, `verifyBlock`
- `genesisCanonical`, `blockCanonical`, `computeBlockHash`, `inspectBlock`, `isGenesisBlock`
- `verifySingleBlock`, `verifyChain`
- `generateFeed`
- All types exported correctly in `dist/index.d.mts`

### AC-4: package.json publish-ready ✓
- `"type": "module"` ✓
- `"exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }` ✓
- `"files": ["dist"]` ✓
- No `dependencies` key — only `devDependencies` ✓

### AC-5: Full pipeline passes ✓
`Tasks: 4 successful, 4 total` — lint, typecheck, build, test.
88 tests across 14 test files all pass.

---

## Implementation Notes

All implementation was completed in Stories 2.1–2.6. This story verified the assembled package is correct.

Key decision captured: `tsdown` was preferred over `tsup` for its first-class ESM + dts support. The `tsdown.config.ts` uses `format: ['esm'], dts: true, clean: true, sourcemap: true`.

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6
