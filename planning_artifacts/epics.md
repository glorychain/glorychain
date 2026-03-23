---
project: glorychain
author: Finn
date: 2026-03-22
updated: 2026-03-23
source: derived from prd.md + architecture.md implementation sequence
mvp1: Epics 1–5 (Protocol & Library)
mvp2: Epics 6–9 (SaaS Platform) — see glorychain-saas repo
---

# Glorychain — Epics

_Epics 1–5 cover the open protocol (this repo). MVP 1 is complete._
_Epics 6–9 and Epic 10.6 cover the SaaS platform — see [glorychain-saas/planning_artifacts/epics.md](https://github.com/finnfitzsimons3/glorychain-saas/blob/main/planning_artifacts/epics.md)._

---

## Epic 1: Monorepo Foundation & Shared Config

Establish the pnpm + Turborepo monorepo, shared TypeScript config, Biome linting, CI pipeline skeleton, and root workspace. All subsequent packages depend on this foundation being stable.

### Story 1.1: Monorepo scaffold and workspace config

Set up pnpm workspace root, `pnpm-workspace.yaml`, `turbo.json` task pipeline (build, test, lint), `tsconfig.base.json` (strict), `biome.json`, `.gitignore`, `.env.example`, and CI workflow skeletons (`ci.yml`, `publish.yml`). All packages can build and lint from root.

### Story 1.2: Shared internal package

Create `packages/shared` with Zod validators for `CreateChainSchema`, `AppendBlockSchema`, and `SubmitSuggestionSchema`. Used by both `apps/web` server and client. Exported via `index.ts` only.

---

## Epic 2: Core Protocol Library

Build `@glory-chain/core` — the zero-dependency chain engine covering chain lifecycle, block construction, cryptographic signing, verification, and RSS feed generation. This is the most critical component: the spec is the product.

FR coverage: FR1–FR14, FR22, FR47–FR50, FR51–FR55, FR56–FR58, FR59 (schema only)

### Story 2.1: Schema types and Zod validators

Define all TypeScript types and Zod schemas in `packages/core/src/schema/`: `Block`, `GenesisBlock`, `ForkGenesisBlock`, `ChainMetadata`, `VerificationResult`, `Connector` interface, `ErrorCode` enum, `GloryChainError`, `Result<T,E>`. Reserve `externalAnchor` field in genesis schema (FR59 — schema only). Protocol version carried on every block (FR14).

### Story 2.2: Cryptographic primitives

Implement `packages/core/src/crypto/`: `hash.ts` (configurable, default SHA-256), `sign.ts` (configurable, default Ed25519), `keygen.ts` (keypair generation with mandatory custody warning — FR7). All outputs: lowercase hex hashes (64-char), Base64url signatures. Zero runtime dependencies enforced via tsdown build check (FR56, NFR14, NFR17).

### Story 2.3: Chain lifecycle — create, append, fork, migrate

Implement `packages/core/src/chain/`: `create.ts` (FR1), `append.ts` (FR2 — chain ID in signed payload, replay prevention FR12), `fork.ts` (FR5, FR51, FR52 — provenance reference to source block), `migrate.ts` (FR6 — permanent migration record). All functions return `Result<T,E>` — no thrown errors. Property-based tests with fast-check for determinism.

### Story 2.4: Block construction and inspection

Implement `packages/core/src/block/`: `build.ts` (construct block, compute hash), `inspect.ts` (FR13 — raw block structure inspection). Block hash includes: content, previous hash, chain ID, block number, timestamp, signature.

### Story 2.5: Verification engine

Implement `packages/core/src/verify/`: `verifyBlock.ts` (FR3), `verifyChain.ts` (FR4, FR47, FR50). `VerificationResult` includes specific error codes: `INVALID_SIGNATURE`, `BROKEN_CHAIN`, `REPLAY_DETECTED`, `ALGORITHM_UNSUPPORTED`, `FUTURE_TIMESTAMP`, `DUPLICATE_BLOCK` (FR50). Property-based tests with fast-check — determinism is a correctness requirement. Version-aware verification (FR14).

### Story 2.6: RSS/Atom feed generator

Implement `packages/core/src/feed/generateFeed.ts` — Atom 1.0 feed from chain + blocks (FR22). Pure function, no I/O, no network. Used by CLI (FR32) and SaaS route handler.

### Story 2.7: Package bundling and public API surface

Configure `tsdown.config.ts` for ESM-only output with ≤50KB bundle budget check (NFR4, NFR17). Define `packages/core/src/index.ts` — public exports only, no internal path leakage. Publish-ready `package.json`. Verify zero runtime dependencies in built output.

---

## Epic 3: File System Connector

Build `@glory-chain/fs` — the file system persistence connector. First connector to implement the versioned `Connector` interface contract. Establishes the integration test pattern for all subsequent connectors.

FR coverage: FR15, FR18, FR19, FR20

### Story 3.1: FsConnector implementation

Implement `packages/fs/src/connector.ts` — `FsConnector` implementing the full `Connector` interface: `read()`, `write()` (idempotent), `watch()`, `migrate()`, `verify()`. Stores chain as JSON files on disk. Imports from `@glory-chain/core` public exports only — no internal paths.

### Story 3.2: Threat detection — file watch

Implement `packages/fs/src/watch.ts` — async event emitter detecting: chain file missing, chain file externally modified (hash mismatch), unexpected file added. Emits `ThreatEvent` via `watch()` async iterator. Never throws — all errors emitted as events (FR18).

### Story 3.3: Integration tests

Write `packages/fs/tests/integration/connector.integration.test.ts` — real filesystem, temp dir created per test, cleaned up after. Covers: create + read round-trip, idempotent write, migration event, threat detection trigger. No mocking of filesystem.

---

## Epic 4: CLI

Build the `glory-chain` CLI — thin command-line wrappers over `@glory-chain/core` and connectors. No business logic in CLI layer.

FR coverage: FR27–FR33, FR7 (keygen command)

### Story 4.1: CLI scaffold and config utilities

Set up `apps/cli/src/index.ts` with commander.js root. Implement `utils/output.ts` (consistent stdout formatting, JSON + human-readable modes) and `utils/config.ts` (read/write `.glory-chain` local config file — stores active connector, chain IDs).

### Story 4.2: Chain lifecycle commands

Implement CLI commands in `apps/cli/src/commands/`: `create.ts` (FR27), `append.ts` (FR28), `verify.ts` (FR29), `fork.ts` (FR30), `migrate.ts` (FR31), `feed.ts` (FR32). Each command is a thin wrapper — all logic delegates to core + connector.

### Story 4.3: Utility commands — keygen, inspect, export

Implement `keygen.ts` (FR7 — mandatory custody warning displayed before any key output), `inspect.ts` (FR13), `export.ts` (FR33, FR48, FR49 — portable archive format, offline-verifiable, zero Glory Chain tooling required).

---

## Epic 5: Conformance CLI and GitHub Connector

Build the `glory-chain-conformance` standalone spec test CLI and `@glory-chain/github` connector. These complete MVP 1.

FR coverage: FR16, FR17, FR18, FR20, FR21 (conformance), NFR18, NFR19, NFR20

### Story 5.1: Conformance CLI scaffold

Set up `apps/conformance/src/index.ts` with commander.js root. Implement `runner.ts` — zero Glory Chain infra dependency, runnable by third-party implementations. Produces TAP-compatible output. Zero deps outside spec + Node built-ins (FR21, NFR18, NFR19).

### Story 5.2: Conformance test suites

Implement `apps/conformance/src/suites/`: `genesis.ts` (genesis block conformance), `append.ts` (block append conformance), `verify.ts` (verification conformance — FR54), `fork.ts` (fork conformance), `replay.ts` (replay attack prevention — FR12). Any implementation that passes is considered interoperable (NFR19).

### Story 5.3: GitHub connector implementation

Implement `packages/github/src/connector.ts` — `GitHubConnector` implementing full `Connector` interface. Stores chain as JSON file in GitHub repository. `packages/github/src/pages.ts` — auto-generates GitHub Pages public read URL (FR17). Connector interface versioned — v1 connectors work with future core versions (NFR20).

### Story 5.4: GitHub connector threat detection and integration tests

Implement `packages/github/src/watch.ts` — threat detection: repo deleted, repo made private, file content modified externally. Emits `ThreatEvent` (FR18). Write `packages/github/tests/integration/connector.integration.test.ts` — real GitHub token, scratch repo created per test run, auto-cleanup on pass/fail.

---

## Epics 6–9: SaaS Platform

> Moved to the `glorychain-saas` repo.
> See [glorychain-saas/planning_artifacts/epics.md](https://github.com/finnfitzsimons3/glorychain-saas/blob/main/planning_artifacts/epics.md)

---

## Epic 10: Block Body Schema Validation ✅

Enable chain creators to embed a JSON Schema definition inside the genesis block. Every subsequent block's content is validated against that schema before it is accepted and signed. The schema is part of the genesis block's canonical payload — signed and tamper-evident by design. Chains without a schema behave exactly as before: **fully backwards compatible**.

### Story 10.1: `contentSchema` field on `GenesisBlock` — types, canonical form, and schema validators ✅

Add optional `contentSchema?: JsonSchemaV7` to `GenesisBlock`. Include in canonical genesis payload as `contentSchema ?? null` — deterministic whether schema is present or absent. Extend `CreateChainSchema` in `@glorychain/shared` to accept optional `contentSchema`.

### Story 10.2: Schema validation in `appendBlock()` ✅

Before signing, check genesis `contentSchema`. If present and `validateContent` option provided: parse content as JSON, validate against schema, return `SCHEMA_VIOLATION` error on failure. Block is never signed if validation fails.

### Story 10.3: Validator injection pattern — keeping core dependency-free ✅

`ContentValidator` function type injected as optional `validateContent` on `AppendOptions` and `VerifyOptions`. `createAjvValidator()` factory exported as opt-in reference implementation. `ajv` declared as peer dependency only — not included in bundle.

### Story 10.4: `verifyChain()` replays schema validation ✅

When `validateContent` option provided and genesis has `contentSchema`, every non-genesis block is validated during verification. `VerificationResult.errors` changed from `ErrorCodeValue[]` to `VerificationError[]` (semver major).

### Story 10.5: CLI — `--schema` flag and schema validation error display

Pending. Add `--schema` flag to `glorychain create` (inline JSON or `@file.json`). Surface `SCHEMA_VIOLATION` errors with field paths in `append` and `verify` output.

### Story 10.6: SaaS — schema display and schema-aware forms

> Moved to `glorychain-saas`.
> See [glorychain-saas/planning_artifacts/epics.md](https://github.com/finnfitzsimons3/glorychain-saas/blob/main/planning_artifacts/epics.md#story-106-schema-display-schema-aware-suggestion-form-and-api-validation)
