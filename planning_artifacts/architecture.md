---
stepsCompleted: [step-01-init, step-02-context, step-03-starter, step-04-decisions, step-05-patterns, step-06-structure, step-07-validation, step-08-complete]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-22'
inputDocuments:
  - planning_artifacts/prd.md
  - planning_artifacts/product-brief-glory-chain-2026-03-22.md
workflowType: 'architecture'
project_name: 'glory-chain'
user_name: 'Finnfitzsimons3'
date: '2026-03-22'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements — 60 FRs across 10 capability areas:**

| Area | FRs | Architectural Signal |
|------|-----|---------------------|
| Chain Lifecycle Management | 8 | Core engine — pure functions, no side effects, fully testable in isolation |
| Block & Schema | 6 | Data contract layer — must be stable before anything else ships |
| Persistence & Connectors | 7 | Plugin boundary — connector interface is the most critical API surface in the system |
| Feed & Distribution | 5 | Read-only, cacheable, stateless — ideal CDN candidate |
| CLI | 7 | Thin wrapper over core library — no business logic lives here |
| Identity & Authentication (SaaS) | 6 | Clean separation needed: OAuth identity ≠ chain identity |
| SaaS Chain Management | 6 | CRUD + approval workflow — conventional web app patterns |
| Verification & Export | 4 | Pure computation — no network, no storage, deterministic |
| Fork & Resilience | 5 | Metadata operations on existing chains + new chain creation |
| Developer Integration | 3 | Zero-dependency constraint is hard — must be enforced at build time |
| External Chain Anchoring | 2 | Schema-reserved in MVP 1; Phase 3 active verification |

**Non-Functional Requirements — key architectural drivers:**

- **NFR14** (zero runtime dependencies in core) — hardest constraint. Forces strict package boundary between `@glory-chain/core` and all connectors. Core must ship as pure computation with no I/O.
- **NFR11** (permalink identity = content-addressable by hash) — content-addressed storage pattern throughout; no mutable URLs for published blocks.
- **NFR4** (≤50KB bundle, tree-shakeable) — ESM-first architecture; no barrel exports that import everything.
- **NFR5** (private key never transmitted) — signing must happen in caller's process. SaaS platform signs server-side only when it holds the key under SaaS-custody path.
- **NFR17** (Node ≥18, ESM browsers, Deno) — pure ESM, no CJS shims, no Node built-in APIs in core.
- **NFR19** (conformance test suite) — the spec itself is a versioned artifact; conformance harness is a standalone component.
- **NFR15** (CDN-cache-friendly reads) — immutable content model; append-only means cache forever, invalidate only on new block.

**Scale & Complexity:**

- **Complexity level: High** — novel protocol design; cryptographic identity model; plugin architecture with threat detection; two delivery surfaces with different runtime targets
- **Primary domain:** Developer tool (library/CLI) + API backend (SaaS) — two distinct architectural concerns sharing a protocol layer
- **Estimated architectural components: 13**
  1. Core chain engine
  2. Block & genesis schema
  3. Connector interface (versioned public API contract)
  4. File system connector
  5. GitHub connector
  6. RSS/Atom feed generator
  7. CLI
  8. SaaS API backend
  9. SaaS web UI
  10. Auth layer (OAuth + SaaS key custody)
  11. Suggestion queue
  12. Private internal chain registry *(KPI tracking + account management — never public)*
  13. Conformance test CLI *(standalone, zero platform dependency, runnable by third parties)*

---

### Technical Constraints & Dependencies

1. **The spec is the product** — protocol spec is a first-class versioned artifact. Schema changes require versioning decisions before implementation.
2. **Connector interface is a public contract** — breaking changes require an RFC. Must be versioned from day one. v1 connectors must work with v2 core.
3. **Two MVPs in strict sequence** — Protocol & Library ships first and must be self-contained. SaaS must not create circular dependencies into core.
4. **Open core constraint** — SaaS-only features cannot leak into `@glory-chain/core`. The library must be fully functional without the SaaS.
5. **External chain anchoring** — `externalAnchor` field reserved in genesis schema in MVP 1; verification logic deferred to Phase 3. Schema must accommodate this without a breaking change.
6. **Key export requirement** — SaaS-custody chains must be migrateable to self-custody at any time without platform involvement in signing. "Open core permanence" is a false promise without this.
7. **Genesis template library** — static content component serving curated genesis templates for common institution types (council, NGO, open source project). Static-first (JSON shipped with app); admin-editable in Phase 3.

---

### Cross-Cutting Concerns

1. **Cryptographic identity** — touches every layer: block creation, verification, CLI, SaaS key custody, fork genesis, conformance testing
2. **Protocol versioning** — every block carries `protocolVersion`; verification must be version-aware; connectors must handle older block formats
3. **Immutability guarantee** — architectural invariant, not a policy; no update or delete paths anywhere in the write path
4. **Content-addressability** — hashes are identifiers; same content + same previous hash = same hash always; determinism is a correctness requirement
5. **Connector threat detection** — async, event-driven; must not block the main append path; connector watch failure must not affect chain reads/writes
6. **Two custody paths** — self-custody (caller holds key, signs before calling library) vs SaaS-custody (platform signs on behalf); library API must support both without knowing which is in use
7. **Private vs public discoverability boundary** — no public chain index by design; private internal registry exists for KPI tracking and account management but is explicitly never exposed as a public API
8. **Property-based testing as architectural principle** — `@glory-chain/core` determinism is a correctness requirement; test strategy should favour property-based tests (fast-check) over snapshot tests throughout the core engine

---

## Starter Template Evaluation

### Primary Technology Domain

**Multi-surface monorepo** — three distinct package types requiring different setups: TypeScript library packages, a Node.js CLI, and a full-stack web application.

### Stack Decisions

| Concern | Choice | Version | Rationale |
|---------|--------|---------|-----------|
| Monorepo | pnpm workspaces + Turborepo | pnpm 10.32, Turbo 2.8 | pnpm for workspace management; Turborepo for task orchestration and caching |
| Language | TypeScript | 5.9.x | TS 6.0 RC imminent — pin to 5.9, upgrade post-stable |
| SaaS framework | Next.js App Router | 16.2 | Full-stack, one repo, minimal ops — right fit for solo founder + thin SaaS surface |
| Database ORM | Drizzle | 0.45 | Lighter than Prisma, no Rust engine, SQL-like TypeScript, better edge runtime support |
| Database | PostgreSQL | 17 | pg17 over pg18 (pg18 very recent — one cycle behind for ecosystem maturity) |
| Database hosting | Render managed PostgreSQL | — | Consistent with web service hosting; paid tier from day one |
| Deployment | Render | — | Managed PostgreSQL + web services, simple ops for solo founder |
| Library bundler | tsdown | latest | tsup no longer actively maintained; tsdown is the maintained successor |
| Testing | Vitest | 4.1 | ESM-native, fast, single runner across all monorepo packages |
| Property-based tests | fast-check | 4.5 | Core engine determinism — correctness over coverage |
| CLI framework | commander.js | 14 | Stable, Node ≥20, well-maintained |
| UI components | shadcn/ui + Tailwind CSS | latest | WCAG 2.1 AA via Radix primitives; zero bundle cost for unused components |
| Linting + formatting | Biome | latest | Replaces ESLint + Prettier; native Turborepo 2.7+ support |

### Monorepo Initialization

```bash
npx create-turbo@latest glory-chain --package-manager pnpm
```

### Workspace Structure

```
glory-chain/
├── packages/
│   ├── core/              # @glory-chain/core — pure chain engine, zero runtime deps
│   ├── fs/                # @glory-chain/fs — file system connector
│   └── github/            # @glory-chain/github — GitHub connector
├── apps/
│   ├── cli/               # glory-chain CLI (global npm install)
│   ├── web/               # SaaS platform (Next.js 16 App Router)
│   └── conformance/       # glory-chain-conformance — standalone spec test CLI
├── planning_artifacts/
├── _bmad/
├── turbo.json
└── pnpm-workspace.yaml
```

> `packages/` = libraries you import. `apps/` = executables you run. Conformance CLI lives in `apps/` — it is distributed and run as a standalone executable, not imported as a dependency.

### Architectural Decisions Established by This Stack

**Build & Bundle:**
- `tsdown` for all library packages — ESM output, tree-shakeable, ≤50KB budget enforced at build time
- Next.js built-in bundler for SaaS web app
- Turborepo task graph: `build` depends on upstream packages; `test` runs in parallel

**Testing Infrastructure:**
- Vitest across all packages — single test runner, shared config at monorepo root
- `fast-check` in `packages/core` — property-based correctness tests for chain engine determinism
- Connector integration tests hit real infrastructure — no mocks:
  - `packages/fs`: real filesystem, temp directory, automatic cleanup
  - `packages/github`: real GitHub token + scratch repo, created at test start, deleted at test end
- **CI contract test:** `apps/conformance` runs against `@glory-chain/core` on every push — reference implementation must always pass its own conformance suite

**TypeScript Config:**
- Strict mode everywhere
- Shared `tsconfig.base.json` at root; each package extends it
- `noEmit: true` in source tsconfig; `tsdown` handles emit for library packages

**Code Quality:**
- Biome for linting + formatting (single tool, fast, Turborepo-native)
- Shared Biome config at monorepo root

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):**
- Protocol spec and block schema versioned and stable before any other package is written
- Connector interface contract finalised before `@glory-chain/fs` or `@glory-chain/github` are implemented
- Envelope encryption scheme for SaaS key custody designed before SaaS auth ships
- tRPC router shape designed before SaaS web UI components are built

**Important (shape architecture significantly):**
- Migration-file-first Drizzle strategy — no `push` in production
- `Result<T, E>` error pattern in core library — no thrown exceptions for expected errors
- Zero-dependency enforcement in `@glory-chain/core` at build time via tsdown config
- Auth.js v5 for OAuth — no Clerk, no custom auth

**Deferred (post-MVP):**
- Redis/Upstash rate limiting (replace in-memory sliding window in Phase 3)
- Upstash Redis caching for SaaS API reads (Phase 3)
- Sentry/Axiom observability (Phase 3)
- Zustand (add only if React state proves insufficient)

---

### Data Architecture

**Schema migrations:** Drizzle `generate` + `migrate` pattern — SQL migration files committed to source control. No `drizzle-kit push` in production. Every schema change has an auditable migration file.

**Runtime validation:** Zod — API boundaries, environment variable parsing, form inputs. Shared Zod schemas between SaaS API and web UI via a `packages/shared` package.

**Caching:** No application-level cache in MVP. Render PostgreSQL with connection pooling sufficient for MVP scale. Public chain read endpoints rely on CDN caching (immutable content — cache forever, purge on new block append). Redis/Upstash added in Phase 3.

**Key tables (SaaS database):**
- `users` — OAuth identity, account tier
- `chains` — chainId, slug, visibility, creatorId, custodyType, encryptedPrivateKey (nullable — only for SaaS-custody chains)
- `blocks` — blockNumber, chainId, content, hash, signature, timestamp
- `suggestions` — proposedContent, chainId, submitterId, status, createdAt
- `api_keys` — prefix, hash, userId, tier, createdAt, lastUsedAt
- `migration_events` — chainId, fromConnector, toConnector, timestamp

---

### Authentication & Security

**OAuth library:** Auth.js v5 — open source, native Next.js App Router support, no vendor lock-in. GitHub + Google providers.

**SaaS key custody — envelope encryption:**
- Per-user data encryption key (DEK) generated at account creation
- DEK encrypted with a key encryption key (KEK) stored as a Render environment secret
- Ed25519 private key encrypted with DEK, stored in `chains` table
- Decryption only occurs server-side at signing time — key never leaves the server
- Key export endpoint: owner can download their encrypted private key + DEK at any time (enables migration from SaaS-custody to self-custody)

**API key pattern:** `glc_` prefix + 32 random bytes (base58-encoded). Only the SHA-256 hash stored in database. Key shown once at creation — never retrievable again.

**Authorization model:**
- Next.js middleware validates session/API key on all non-public routes
- Public routes (no auth): chain read, block read, RSS feed endpoints
- tRPC procedures carry session context — ownership checked at procedure level, not middleware

---

### API & Communication

**SaaS API pattern:** tRPC for authenticated SaaS operations (web UI ↔ API — type-safe, no schema duplication). Plain Next.js route handlers for public endpoints (chain read, RSS feed, block permalink) — these must be cache-friendly and accessible without a tRPC client.

**Error handling:**
- `@glory-chain/core`: `Result<T, GloryChainError>` return type — no thrown exceptions for expected errors (invalid signature, broken chain, etc.). Thrown exceptions reserved for truly unexpected failures (out of memory, etc.).
- SaaS tRPC: `TRPCError` with typed error codes mapping to PRD error codes
- Public REST endpoints: standard HTTP error shapes `{ error: string, code: string }`

**Rate limiting (MVP):** In-memory sliding window per API key, 100 req/min (Pro), 1000 req/min (Org). Replaced with Upstash Redis in Phase 3 for accuracy under concurrent load.

**RSS endpoints:** Standard Next.js route handlers returning `application/atom+xml`. CDN-cacheable, ETag-based validation. Cache invalidation triggered on block append.

---

### Frontend Architecture (SaaS Web)

**Rendering strategy:** React Server Components for all data-fetching views (chain list, chain detail, block history). Client Components only where interactivity is required (block append form, suggestion queue, genesis creation wizard).

**State management:** React state + Next.js server actions for forms. No global state library in MVP. Zustand added only if cross-component state proves necessary.

**Forms:** React Hook Form + Zod — standard shadcn/ui form pattern. Zod schemas shared from `packages/shared`.

**Component structure:**
- `apps/web/components/ui/` — shadcn/ui primitives (auto-generated, not edited)
- `apps/web/components/chain/` — chain-specific composites (ChainCard, BlockList, etc.)
- `apps/web/components/forms/` — form components (AppendBlockForm, CreateChainForm, etc.)

---

### Infrastructure & Deployment

**CI/CD:** GitHub Actions. Pipeline per package: `lint → build → test`. Turborepo remote caching via `TURBO_TOKEN` to skip unchanged packages. Render deploy hook triggered on merge to `main`.

**Environment configuration:**
- Local: `dotenv-flow` with `.env.local` and `.env.test`
- Production: Render environment groups
- Validation: single `env.ts` module in each app using Zod — process exits at startup if required vars missing

**Deployment topology:**
- `apps/web` → Render web service (Node.js runtime, not edge)
- Database → Render managed PostgreSQL 17
- `apps/cli` → npm publish on tag push
- `packages/core`, `packages/fs`, `packages/github`, `apps/conformance` → npm publish on tag push

**Monitoring (MVP):** Render built-in logging + structured JSON stdout. Error surfacing via Render alert rules. Full observability (Sentry, Axiom) added in Phase 3.

---

### Decision Impact Analysis

**Implementation sequence driven by dependencies:**
1. Protocol spec + block schema (blocks everything else)
2. `@glory-chain/core` (blocks connectors and CLI)
3. `@glory-chain/fs` (blocks local dev workflow)
4. `apps/cli` (unblocks Builder journey)
5. `apps/conformance` (validates spec before SaaS ships)
6. `@glory-chain/github` (unblocks GitHub connector journey)
7. `apps/web` auth + chain creation (MVP 2 begins)
8. `apps/web` public read + RSS (unblocks Demander journey)
9. `apps/web` suggestion queue (completes MVP 2)

**Cross-component dependencies:**
- `packages/shared` (Zod schemas) — consumed by `apps/web` and SaaS API; must be extracted early
- Auth.js session — required by all authenticated tRPC procedures
- Envelope encryption — required before any SaaS-custody chain can be created
- Connector interface contract — must be stable before any connector is implemented

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (Drizzle + PostgreSQL):**
- Tables: `snake_case` plural — `users`, `chains`, `blocks`, `suggestions`, `api_keys`, `migration_events`
- Columns: `snake_case` — `chain_id`, `created_at`, `block_number`, `previous_hash`
- Foreign keys: `{table_singular}_id` — `chain_id`, `user_id`
- Indexes: `idx_{table}_{column(s)}` — `idx_chains_slug`, `idx_blocks_chain_id`
- Drizzle schema files: `schema/{table}.ts` — one file per table

**API (tRPC + REST):**
- tRPC router names: `camelCase` — `chainRouter`, `blockRouter`, `suggestionRouter`
- tRPC procedures: `camelCase` verbs — `create`, `append`, `getById`, `listPublic`, `approve`
- Public REST routes: `kebab-case` plural nouns — `/api/chains/[slug]`, `/api/chains/[slug]/feed.xml`, `/api/chains/[slug]/blocks/[hash]`
- Query params: `camelCase` — `?chainId=`, `?blockNumber=`

**TypeScript (all packages):**
- Files: `camelCase.ts` for modules, `PascalCase.tsx` for React components
- Functions: `camelCase` — `createChain`, `appendBlock`, `verifyChain`
- Types/interfaces: `PascalCase` — `Block`, `GenesisBlock`, `VerificationResult`, `ChainMetadata`
- Constants: `SCREAMING_SNAKE_CASE` — `DEFAULT_HASH_ALGORITHM`, `MAX_BLOCK_CONTENT_LENGTH`
- Zod schemas: `PascalCase` + `Schema` suffix — `BlockSchema`, `GenesisBlockSchema`

---

### Structure Patterns

**Test co-location:** Tests live next to source — `createChain.ts` + `createChain.test.ts` in the same directory. No separate `__tests__/` folders. Exception: integration tests in `{package}/tests/integration/`.

**Package internals:**
```
packages/core/
├── src/
│   ├── chain/         # chain lifecycle — create, append, fork, migrate
│   ├── block/         # block construction and hashing
│   ├── verify/        # verification engine
│   ├── crypto/        # signing, hashing, key generation
│   ├── feed/          # RSS/Atom generation
│   ├── schema/        # TypeScript types + Zod schemas
│   └── index.ts       # public exports only — no internal leakage
├── tests/integration/
└── package.json
```

**SaaS web app:**
```
apps/web/
├── app/               # Next.js App Router — routes only, no business logic
│   ├── (public)/      # unauthenticated routes
│   └── (auth)/        # authenticated routes
├── components/
│   ├── ui/            # shadcn/ui primitives — never edited directly
│   ├── chain/         # chain-domain composites
│   └── forms/         # form components
├── server/
│   ├── routers/       # tRPC routers — one file per domain
│   ├── db/            # Drizzle client + schema imports
│   └── auth.ts        # Auth.js config
├── lib/               # shared utilities, env validation
└── env.ts             # Zod env validation — imported at startup
```

---

### Format Patterns

**tRPC responses:** Typed data returned directly — no wrapper envelope. Errors via `TRPCError`. Never wrap in `{ data: ..., error: ... }`.

**Public REST responses:**
- Success: direct JSON or XML body, no envelope
- Error: `{ "error": "Human-readable message", "code": "ERROR_CODE" }` — matches PRD error codes exactly

**Dates:** ISO 8601 strings everywhere — `2026-03-22T10:31:21.245Z`. Never Unix timestamps. Drizzle `timestamp` columns use `{ mode: 'string' }`.

**Chain IDs:** UUID v4 via `crypto.randomUUID()` — never nanoid or custom formats in `@glory-chain/core`.

**Block hashes:** Lowercase hex strings — 64-char SHA-256 hex. Never Base64, never uppercase.

**Signatures:** Base64url-encoded (URL-safe, no padding) — consistent across CLI, library, and SaaS.

---

### Error Handling Patterns

**`@glory-chain/core` — Result pattern:**
```typescript
type Result<T, E = GloryChainError> =
  | { ok: true; value: T }
  | { ok: false; error: E }

// Always return Result, never throw for expected errors
const result = verifyChain(chain)
if (!result.ok) {
  // result.error.code is a typed ErrorCode from PRD
}
```

**SaaS tRPC:**
```typescript
throw new TRPCError({ code: 'BAD_REQUEST', message: 'INVALID_SIGNATURE' })
```

**React components:** Route-level error boundaries via `error.tsx`. No try/catch in render functions. Form errors via React Hook Form `formState.errors` — never toast for validation errors.

**Logging:** Structured JSON to stdout `{ level, message, ...context }`. No `console.log` in library packages. `console.error` only for unexpected errors in SaaS server code.

---

### Connector Interface Pattern

All connectors implement exactly:
```typescript
interface Connector {
  version: string
  read(chainId: string): Promise<Chain>
  write(chain: Chain): Promise<void>
  watch(chainId: string): AsyncIterator<ThreatEvent>
  migrate(chainId: string, target: Connector): Promise<void>
  verify(chainId: string): Promise<VerificationResult>
}
```

- `watch()` must never throw — emit error events as `ThreatEvent`
- `write()` is idempotent — writing the same chain twice is safe
- Connectors import from `@glory-chain/core` public exports only — never internal paths

---

### Process Patterns

**Loading states:** Next.js `loading.tsx` for route-level suspense. `useTransition` + `isPending` for form submissions. No custom loading boolean state in components.

**Environment validation:** Every app has `env.ts` — Zod parse at module load time. Process exits with clear error if validation fails. No `process.env.FOO` access outside `env.ts`.

**Optimistic updates:** Not used in MVP — chains are append-only and low-frequency. Server state is authoritative.

---

### Enforcement

**All agents MUST:**
- Import from package `index.ts` only — never from internal paths
- Use `Result<T, E>` in `@glory-chain/core` — no thrown errors for expected failures
- Co-locate tests with source files
- Use ISO 8601 strings for all date/time values
- Validate all environment variables via `env.ts`

**Never:**
- Add runtime dependencies to `@glory-chain/core`
- Expose internal module paths in package exports
- Use `any` — use `unknown` and narrow
- Store private keys unencrypted in the database
- Write `console.log` in library package source

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
glory-chain/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # lint, build, test on PR
│       └── publish.yml               # npm publish on tag push
├── .env.example
├── .gitignore
├── biome.json                        # shared linting + formatting config
├── package.json                      # root workspace
├── pnpm-workspace.yaml
├── tsconfig.base.json                # strict TS — all packages extend
├── turbo.json                        # task pipeline: build, test, lint
│
├── packages/
│   ├── core/                         # @glory-chain/core
│   │   ├── src/
│   │   │   ├── chain/
│   │   │   │   ├── create.ts         # FR1 — createChain()
│   │   │   │   ├── create.test.ts
│   │   │   │   ├── append.ts         # FR2 — appendBlock()
│   │   │   │   ├── append.test.ts
│   │   │   │   ├── fork.ts           # FR5 — forkChain()
│   │   │   │   ├── fork.test.ts
│   │   │   │   ├── migrate.ts        # FR6 — migrateChain()
│   │   │   │   └── migrate.test.ts
│   │   │   ├── block/
│   │   │   │   ├── build.ts          # construct block + compute hash
│   │   │   │   ├── build.test.ts
│   │   │   │   └── inspect.ts        # FR12 — inspectBlock()
│   │   │   ├── verify/
│   │   │   │   ├── verifyBlock.ts    # FR3
│   │   │   │   ├── verifyBlock.test.ts
│   │   │   │   ├── verifyChain.ts    # FR4
│   │   │   │   ├── verifyChain.test.ts
│   │   │   │   └── verifyChain.property.test.ts  # fast-check property tests
│   │   │   ├── crypto/
│   │   │   │   ├── hash.ts           # configurable hashing (default: sha256)
│   │   │   │   ├── hash.test.ts
│   │   │   │   ├── sign.ts           # configurable signing (default: ed25519)
│   │   │   │   ├── sign.test.ts
│   │   │   │   └── keygen.ts         # FR7 — keypair generation + custody warning
│   │   │   ├── feed/
│   │   │   │   ├── generateFeed.ts   # FR19 — Atom 1.0 feed
│   │   │   │   └── generateFeed.test.ts
│   │   │   ├── schema/
│   │   │   │   ├── block.ts          # Block, GenesisBlock, ForkGenesisBlock types + Zod
│   │   │   │   ├── chain.ts          # ChainMetadata, Connector interface types + Zod
│   │   │   │   ├── errors.ts         # ErrorCode enum, GloryChainError, Result<T,E>
│   │   │   │   └── verification.ts   # VerificationResult type + Zod
│   │   │   └── index.ts              # public API surface only
│   │   ├── tests/integration/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsdown.config.ts          # ESM output, ≤50KB budget check
│   │
│   ├── fs/                           # @glory-chain/fs
│   │   ├── src/
│   │   │   ├── connector.ts          # FsConnector implements Connector
│   │   │   ├── connector.test.ts
│   │   │   └── watch.ts              # threat detection — file missing/modified
│   │   ├── tests/integration/
│   │   │   └── connector.integration.test.ts  # real filesystem, temp dir + cleanup
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── github/                       # @glory-chain/github
│   │   ├── src/
│   │   │   ├── connector.ts          # GitHubConnector implements Connector
│   │   │   ├── connector.test.ts
│   │   │   ├── pages.ts              # GitHub Pages URL generation (FR15)
│   │   │   └── watch.ts              # threat detection — repo deleted/made private
│   │   ├── tests/integration/
│   │   │   └── connector.integration.test.ts  # real GH token, scratch repo, auto-cleanup
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                       # internal — Zod schemas shared between web + API
│       ├── src/
│       │   ├── validators/
│       │   │   ├── chain.ts          # CreateChainSchema, AppendBlockSchema
│       │   │   └── suggestion.ts     # SubmitSuggestionSchema
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   ├── cli/                          # glory-chain (global CLI)
│   │   ├── src/
│   │   │   ├── index.ts              # commander.js root
│   │   │   ├── commands/
│   │   │   │   ├── create.ts         # FR23
│   │   │   │   ├── append.ts         # FR24
│   │   │   │   ├── verify.ts         # FR25
│   │   │   │   ├── fork.ts           # FR26
│   │   │   │   ├── migrate.ts        # FR27
│   │   │   │   ├── feed.ts           # FR28
│   │   │   │   ├── keygen.ts         # FR7  — mandatory custody warning
│   │   │   │   ├── inspect.ts        # FR12
│   │   │   │   └── export.ts         # FR29
│   │   │   └── utils/
│   │   │       ├── output.ts         # consistent stdout formatting
│   │   │       └── config.ts         # read/write local .glory-chain config
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── conformance/                  # glory-chain-conformance (standalone spec test CLI)
│   │   ├── src/
│   │   │   ├── index.ts              # commander.js root
│   │   │   ├── suites/
│   │   │   │   ├── genesis.ts        # genesis block conformance tests
│   │   │   │   ├── append.ts         # block append conformance tests
│   │   │   │   ├── verify.ts         # verification conformance tests (FR54)
│   │   │   │   ├── fork.ts           # fork conformance tests
│   │   │   │   └── replay.ts         # replay attack prevention (FR11)
│   │   │   └── runner.ts             # zero Glory Chain infra dependency
│   │   ├── package.json              # zero deps outside spec + Node built-ins
│   │   └── tsconfig.json
│   │
│   └── web/                          # SaaS platform (Next.js 16 App Router)
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── globals.css
│       │   ├── (public)/
│       │   │   ├── page.tsx          # landing page
│       │   │   ├── c/[slug]/
│       │   │   │   ├── page.tsx      # FR37 — public chain read (no auth)
│       │   │   │   ├── loading.tsx
│       │   │   │   └── error.tsx
│       │   │   └── api/
│       │   │       ├── chains/[slug]/
│       │   │       │   ├── route.ts              # public chain JSON
│       │   │       │   ├── feed.xml/route.ts     # FR19 — Atom feed (CDN-cached)
│       │   │       │   └── blocks/[hash]/route.ts # FR21, FR52 — permalinks
│       │   │       └── trpc/[trpc]/route.ts      # tRPC handler
│       │   └── (auth)/
│       │       ├── dashboard/page.tsx
│       │       ├── chains/
│       │       │   ├── new/page.tsx              # FR34 — create chain
│       │       │   └── [slug]/
│       │       │       ├── page.tsx              # chain management
│       │       │       ├── append/page.tsx       # FR35 — append block
│       │       │       └── suggestions/page.tsx  # FR39 — suggestion queue
│       │       └── settings/page.tsx             # key export, account settings
│       ├── components/
│       │   ├── ui/                   # shadcn/ui primitives — never edited directly
│       │   ├── chain/
│       │   │   ├── ChainCard.tsx
│       │   │   ├── BlockList.tsx
│       │   │   ├── BlockItem.tsx
│       │   │   ├── ForkBadge.tsx
│       │   │   └── SilenceBanner.tsx # last block timestamp — chain went silent
│       │   └── forms/
│       │       ├── CreateChainForm.tsx   # genesis template picker + freeform
│       │       ├── AppendBlockForm.tsx
│       │       └── SuggestBlockForm.tsx  # FR38 — public suggestion submission
│       ├── server/
│       │   ├── routers/
│       │   │   ├── chain.ts          # tRPC — create, append, listMine, setVisibility
│       │   │   ├── suggestion.ts     # tRPC — submit, approve, reject
│       │   │   └── account.ts        # tRPC — exportKey, updateSlug
│       │   ├── db/
│       │   │   ├── client.ts         # Drizzle client singleton
│       │   │   └── schema/
│       │   │       ├── users.ts
│       │   │       ├── chains.ts
│       │   │       ├── blocks.ts
│       │   │       ├── suggestions.ts
│       │   │       ├── apiKeys.ts
│       │   │       └── migrationEvents.ts
│       │   ├── auth.ts               # Auth.js v5 config (GitHub + Google)
│       │   ├── crypto.ts             # envelope encryption (DEK/KEK)
│       │   └── rateLimit.ts          # in-memory sliding window
│       ├── lib/
│       │   ├── trpc.ts               # tRPC client setup
│       │   ├── utils.ts
│       │   └── templates.ts          # genesis block templates (static JSON)
│       ├── drizzle/migrations/       # SQL migration files
│       ├── public/
│       ├── env.ts                    # Zod env validation — exits if invalid
│       ├── middleware.ts             # Auth.js session middleware
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── components.json           # shadcn/ui config
│       ├── package.json
│       └── tsconfig.json
│
└── planning_artifacts/
```

---

### Architectural Boundaries

**`@glory-chain/core`:** Zero runtime deps, no I/O, exports only via `index.ts`. All persistence delegated to connectors passed as arguments. No knowledge of SaaS, CLI, or connector implementations.

**Connectors (`@glory-chain/fs`, `@glory-chain/github`):** Import from `@glory-chain/core` public exports only. Own persistence format and threat detection. Implement `Connector` interface — no additional public API surface.

**`apps/cli`:** Thin command parser — all logic delegated to core + connectors. No business logic in CLI layer.

**`apps/web` (SaaS):**
- Public routes (no auth): `/c/[slug]`, RSS, block permalinks, suggestion submission
- Authenticated routes: everything under `(auth)/`
- tRPC: authenticated operations only — public reads use plain Next.js route handlers
- Database access: server-only — never in Client Components

**SaaS ↔ core integration:**
- SaaS-custody: server decrypts DEK → signs block server-side → calls `appendBlock()`
- Self-custody: creator provides pre-signed block content

---

### Requirements to Structure Mapping

| FR Category | Primary Location |
|-------------|-----------------|
| Chain Lifecycle (FR1–FR8) | `packages/core/src/chain/` |
| Block & Schema (FR9–FR14) | `packages/core/src/block/`, `src/schema/` |
| Persistence & Connectors (FR15–FR21) | `packages/fs/`, `packages/github/` |
| Feed & Distribution (FR19, FR22–FR24) | `packages/core/src/feed/`, `apps/web/.../feed.xml/` |
| CLI (FR25–FR31) | `apps/cli/src/commands/` |
| Identity & Auth (FR32–FR38) | `apps/web/server/auth.ts`, `server/crypto.ts` |
| SaaS Chain Management (FR39–FR47) | `apps/web/server/routers/chain.ts`, `app/(auth)/` |
| Verification & Export (FR48–FR52) | `packages/core/src/verify/`, `apps/cli/src/commands/export.ts` |
| Fork & Resilience (FR53–FR58) | `packages/core/src/chain/fork.ts`, `components/chain/ForkBadge.tsx` |
| Conformance (NFR19) | `apps/conformance/src/suites/` |
| External Anchor schema (reserved) | `packages/core/src/schema/block.ts` |

---

### Data Flow

**Public chain read (Demander):**
```
Browser → /c/[slug] → Next.js RSC → Drizzle (chains + blocks) → render
Browser → /api/chains/[slug]/feed.xml → route handler → generateFeed() → Atom XML (CDN-cached)
```

**Block append — SaaS-custody:**
```
Browser → AppendBlockForm → tRPC append → crypto.ts (decrypt DEK → sign) → appendBlock() → Drizzle write → CDN purge
```

**Block append — self-custody (CLI):**
```
glory-chain append <chain-id> --content "..." → appendBlock() → connector.write()
```

**Fork (CLI):**
```
glory-chain fork <chain-id> --from 831 → connector.read() → forkChain() → connector.write()
```

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices are compatible. TypeScript 5.9 + pnpm + Turborepo is a well-established monorepo stack. Next.js 16 App Router + tRPC + Drizzle + Auth.js v5 is a coherent, well-integrated combination. Vitest works across all packages. tsdown as library bundler has no conflicts with any other choice.

**Pattern Consistency:** Result<T,E> in core, TRPCError in SaaS, HTTP error shapes on public REST — three error layers that don't conflict and each serve their context. Naming conventions (snake_case DB, camelCase TS, kebab-case routes) are internally consistent and standard for the stack.

**Structure Alignment:** Project structure maps cleanly to the two-MVP sequence. MVP 1 (`packages/` + `apps/cli` + `apps/conformance`) is fully self-contained. MVP 2 (`apps/web`) builds on top without creating dependencies back into core.

---

### Requirements Coverage Validation ✅

**Functional Requirements — all 60 FRs covered:**

| Status | FR Category | Location |
|--------|-------------|----------|
| ✅ | FR1–FR8 Chain Lifecycle | `packages/core/src/chain/` |
| ✅ | FR9–FR14 Block & Schema | `packages/core/src/block/`, `src/schema/` |
| ✅ | FR15–FR21 Connectors | `packages/fs/`, `packages/github/` |
| ✅ | FR19, FR22–FR24 Feed | `packages/core/src/feed/`, RSS route handler |
| ✅ | FR25–FR31 CLI | `apps/cli/src/commands/` — all 9 commands |
| ✅ | FR32–FR38 Identity/Auth | `server/auth.ts`, `server/crypto.ts` |
| ✅ | FR39–FR47 SaaS Chain Mgmt | tRPC routers + `app/(auth)/` |
| ✅ | FR48–FR52 Verification/Export | `packages/core/src/verify/`, CLI export |
| ✅ | FR53–FR58 Fork/Resilience | `packages/core/src/chain/fork.ts`, `ForkBadge.tsx` |
| ✅ | FR59–FR60 Developer Integration | `packages/core/index.ts`, tsdown bundle check |
| ✅ | FR58 External Anchor (schema reserved) | `packages/core/src/schema/block.ts` |
| ✅ | FR54 Conformance | `apps/conformance/src/suites/` |

**Non-Functional Requirements — all 27 NFRs covered:**

| NFR | Architecture Coverage |
|-----|-----------------------|
| NFR4 (≤50KB bundle) | tsdown budget check at build time |
| NFR5 (key never transmitted) | Server-side DEK decrypt → sign; key export endpoint |
| NFR6 (keys encrypted at rest) | Envelope encryption in `server/crypto.ts` |
| NFR7 (no edit/delete) | No update/delete paths in schema or tRPC |
| NFR11 (permalink = hash) | `/api/chains/[slug]/blocks/[hash]/` content-addressed |
| NFR14 (zero runtime deps in core) | Enforced by tsdown config |
| NFR15 (CDN-cache-friendly) | Public route handlers, cache-forever headers on immutable content |
| NFR17 (Node ≥18, ESM, Deno) | Pure ESM, no Node built-ins in `packages/core` |
| NFR18–NFR19 (spec + conformance) | `apps/conformance/` standalone CLI |
| NFR20 (connector versioning) | `version` field on Connector interface |
| NFR21 (Atom 1.0) | `generateFeed()` in `packages/core/src/feed/` |
| NFR22 (WCAG 2.1 AA) | shadcn/ui + Radix primitives |
| NFR24–NFR26 (privacy/permanence) | No delete in public chain path; SaaS hosting ≠ custody |
| NFR27 (epistemic neutrality messaging) | `CreateChainForm.tsx` — visible before first publish |

---

### Gap Analysis

**Minor — CLI Node version:** Commander 14 requires Node ≥20; NFR17 specifies Node ≥18. Resolution: CLI requires Node ≥20 LTS (documented); library packages remain Node ≥18 compatible.

**Minor — Private chain registry:** Implemented as Drizzle queries over existing `chains` + `blocks` tables — no separate component needed. Never-public constraint enforced by absence of any aggregate public API route.

**Minor — Genesis template storage:** `lib/templates.ts` is a static JSON array `{ id, name, description, content }[]`. No database table in MVP. Admin-editable via a `templates` table in Phase 3.

**No critical gaps.**

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] 60 FRs + 27 NFRs fully analyzed
- [x] Scale and complexity assessed (High — 13 components)
- [x] 8 cross-cutting concerns mapped
- [x] Two-MVP sequence constraint respected throughout

**✅ Architectural Decisions**
- [x] All technology versions verified and documented
- [x] Monorepo structure + all packages defined
- [x] Data architecture + migration strategy defined
- [x] Auth + envelope encryption key custody model fully specified
- [x] API patterns (tRPC + REST split) defined
- [x] Deployment topology on Render documented

**✅ Implementation Patterns**
- [x] Naming conventions: DB, API, TypeScript
- [x] Structure patterns: co-located tests, package internals, SaaS layout
- [x] Format patterns: dates, IDs, hashes, signatures
- [x] Error handling: Result<T,E>, TRPCError, HTTP shapes
- [x] Connector interface contract specified
- [x] Enforcement rules documented

**✅ Project Structure**
- [x] Complete directory tree with FR annotations
- [x] All 13 architectural components have defined locations
- [x] Integration boundaries explicitly documented
- [x] Data flow for all key user journeys

---

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key Strengths:**
- Protocol-first architecture — `@glory-chain/core` zero-dep constraint eliminates a whole class of future bugs
- Two-MVP sequencing is structurally enforced — MVP 1 has no dependency on `apps/web`
- Connector interface is a genuine versioned public contract — third-party ecosystem architecturally possible from day one
- Property-based testing principle baked in — correctness is a first-class concern
- Conformance CLI as a first-class deliverable — spec validation ships alongside the spec

**Areas for future enhancement (Phase 3+):**
- Redis/Upstash rate limiting and caching
- Sentry/Axiom observability
- Admin UI for genesis template management
- External chain anchor verification tooling
- Pluggable data structure modules (tree, graph, ledger)

---

### Implementation Handoff

**First implementation step:**
```bash
npx create-turbo@latest glory-chain --package-manager pnpm
```

**Implementation sequence:**
1. Monorepo scaffold + `tsconfig.base.json` + Biome config
2. `packages/core` — schema types → chain engine → verify → feed
3. `packages/fs` — connector + integration tests
4. `apps/cli` — thin command wrappers over core
5. `apps/conformance` — spec test suite (run against core in CI from day one)
6. `packages/github` — connector + integration tests
7. `apps/web` — auth + DB schema + chain creation (MVP 2 begins)
8. `apps/web` — public read + RSS (Demander journey)
9. `apps/web` — suggestion queue (MVP 2 complete)

**All AI agents must refer to this document for every architectural question. If an answer isn't here, ask before implementing.**

