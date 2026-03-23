# Story 1.2: Shared Internal Package

Status: done

---

## Story

As a developer building the Glory Chain SaaS platform, I want a `packages/shared` package that exports validated Zod schemas for chain creation, block appending, and suggestion submission, so that `apps/web` server-side tRPC input validation and client-side form validation share a single source of truth with no duplication.

---

## Acceptance Criteria

1. `packages/shared/src/validators/chain.ts` exists and exports `CreateChainSchema` and `AppendBlockSchema` as named exports.
2. `packages/shared/src/validators/suggestion.ts` exists and exports `SubmitSuggestionSchema` as a named export.
3. `packages/shared/src/index.ts` exists and re-exports `CreateChainSchema`, `AppendBlockSchema`, and `SubmitSuggestionSchema` — and nothing else.
4. No file other than `packages/shared/src/index.ts` is exported from the package. The `package.json` `exports` field resolves only `"."` to `dist/index.js`.
5. `packages/shared` has `"private": true` in its `package.json` and is not publishable to npm.
6. `CreateChainSchema` validates all fields specified below and rejects invalid inputs with the correct Zod error paths:
   - `purpose`: required string, min 1 char, max 2000 chars
   - `slug`: optional string matching `/^[a-z0-9][a-z0-9-]*[a-z0-9]$/` (lowercase alphanumeric + hyphens), min 3 chars, max 50 chars — when present
   - `visibility`: optional enum `["public", "private"]`, defaults to `"public"`
   - `identityType`: required enum `["oauth", "external", "anonymous"]`
   - `externalIdentifier`: optional string, max 500 chars
   - `hashAlgorithm`: optional string, defaults to `"sha256"`
   - `signatureScheme`: optional string, defaults to `"ed25519"`
   - `externalAnchor`: optional object with required `chainType` (string), required `blockHash` (string), required `blockHeight` (number, non-negative integer), required `networkId` (string)
7. `AppendBlockSchema` validates all fields specified below and rejects invalid inputs with the correct Zod error paths:
   - `chainId`: required string in UUID v4 format
   - `content`: required string, min 1 char, max 50000 chars
   - `timestamp`: required string in ISO 8601 datetime format, parseable as a valid date
   - `publicKey`: optional string
   - `signature`: optional string
8. `SubmitSuggestionSchema` validates all fields specified below and rejects invalid inputs with the correct Zod error paths:
   - `chainSlug`: required string, min 1 char
   - `content`: required string, min 1 char, max 50000 chars
   - `submitterNote`: optional string, max 1000 chars
9. `packages/shared/src/validators/chain.test.ts` exists with Vitest unit tests covering all `CreateChainSchema` and `AppendBlockSchema` field validations — both valid passing cases and invalid rejection cases with error path assertions.
10. `packages/shared/src/validators/suggestion.test.ts` exists with Vitest unit tests covering all `SubmitSuggestionSchema` field validations — both valid passing cases and invalid rejection cases with error path assertions.
11. `packages/shared/vitest.config.ts` exists and configures Vitest for the package.
12. `packages/shared/tsdown.config.ts` exists and configures tsdown for ESM output.
13. `packages/shared/package.json` is updated: `"private": true` is added, and the `build` script is updated to `"tsdown"` (removing the conditional guard now that `src/index.ts` exists).
14. `pnpm turbo lint` exits 0 — Biome finds no errors in `packages/shared`.
15. `pnpm turbo typecheck` exits 0 — TypeScript finds no errors in `packages/shared`.
16. `pnpm turbo test` exits 0 — all Vitest tests in `packages/shared` pass.
17. `pnpm turbo build` exits 0 — tsdown produces `packages/shared/dist/index.js` and `packages/shared/dist/index.d.ts`.
18. No `console.log` calls exist anywhere in `packages/shared/src/`.
19. No `any` types are used anywhere in `packages/shared/src/`.
20. All type-only imports in `packages/shared/src/` use `import type` syntax (required by `verbatimModuleSyntax: true`).

---

## Tasks / Subtasks

### Task 1: Update `packages/shared/package.json` [AC: 5, 13, 17]

- [ ] 1.1 Add `"private": true` to `packages/shared/package.json`.
- [ ] 1.2 Replace the `build` script value from `"test -f src/index.ts && tsdown || true"` to `"tsdown"`.
- [ ] 1.3 Confirm `"zod": "^3.0.0"` is still present in `dependencies` (it was there from Story 1.1 — do not remove it).
- [ ] 1.4 Confirm `"vitest": "^4.1.0"` is present in `devDependencies`.

### Task 2: Create `packages/shared/tsdown.config.ts` [AC: 12, 17]

- [ ] 2.1 Create `packages/shared/tsdown.config.ts` — see Dev Notes for exact content.
- [ ] 2.2 Verify the config targets ESM output only (`format: ["esm"]`) with declaration file generation.
- [ ] 2.3 Verify `entry` points to `src/index.ts`.

### Task 3: Create `packages/shared/vitest.config.ts` [AC: 11, 16]

- [ ] 3.1 Create `packages/shared/vitest.config.ts` — see Dev Notes for exact content.
- [ ] 3.2 Confirm it uses `defineConfig` from `vitest/config` and sets the test environment to `node`.

### Task 4: Create `packages/shared/src/validators/chain.ts` [AC: 1, 6, 7]

- [ ] 4.1 Create the `packages/shared/src/validators/` directory.
- [ ] 4.2 Create `packages/shared/src/validators/chain.ts` — see Dev Notes for full implementation.
- [ ] 4.3 Implement `CreateChainSchema` with all fields per AC 6.
- [ ] 4.4 Implement `AppendBlockSchema` with all fields per AC 7.
- [ ] 4.5 Export inferred TypeScript types `CreateChainInput` and `AppendBlockInput` using `z.infer<>` with `export type`.
- [ ] 4.6 Confirm no `console.log`, no `any`, and all type imports use `import type`.

### Task 5: Create `packages/shared/src/validators/suggestion.ts` [AC: 2, 8]

- [ ] 5.1 Create `packages/shared/src/validators/suggestion.ts` — see Dev Notes for full implementation.
- [ ] 5.2 Implement `SubmitSuggestionSchema` with all fields per AC 8.
- [ ] 5.3 Export inferred TypeScript type `SubmitSuggestionInput` using `z.infer<>` with `export type`.
- [ ] 5.4 Confirm no `console.log`, no `any`, and all type imports use `import type`.

### Task 6: Create `packages/shared/src/index.ts` [AC: 3, 4]

- [ ] 6.1 Create `packages/shared/src/index.ts` — see Dev Notes for exact content.
- [ ] 6.2 Re-export `CreateChainSchema`, `AppendBlockSchema`, `SubmitSuggestionSchema`, and the three inferred input types.
- [ ] 6.3 Confirm this is the only public export surface — no direct imports from internal paths.

### Task 7: Write unit tests for `chain.ts` validators [AC: 9, 16]

- [ ] 7.1 Create `packages/shared/src/validators/chain.test.ts`.
- [ ] 7.2 Write tests for `CreateChainSchema` — valid input passes, invalid inputs fail with correct Zod error paths. See Dev Notes for test plan.
- [ ] 7.3 Write tests for `AppendBlockSchema` — valid input passes, invalid inputs fail with correct Zod error paths. See Dev Notes for test plan.
- [ ] 7.4 Use `describe` / `it` blocks. No `console.log` in test files.

### Task 8: Write unit tests for `suggestion.ts` validators [AC: 10, 16]

- [ ] 8.1 Create `packages/shared/src/validators/suggestion.test.ts`.
- [ ] 8.2 Write tests for `SubmitSuggestionSchema` — valid input passes, invalid inputs fail with correct Zod error paths. See Dev Notes for test plan.
- [ ] 8.3 Use `describe` / `it` blocks. No `console.log` in test files.

### Task 9: Verify turbo tasks pass [AC: 14, 15, 16, 17]

- [ ] 9.1 Run `pnpm turbo lint --filter=@glory-chain/shared` — confirm exit 0.
- [ ] 9.2 Run `pnpm turbo typecheck --filter=@glory-chain/shared` — confirm exit 0.
- [ ] 9.3 Run `pnpm turbo test --filter=@glory-chain/shared` — confirm exit 0, all tests pass.
- [ ] 9.4 Run `pnpm turbo build --filter=@glory-chain/shared` — confirm exit 0, `dist/index.js` and `dist/index.d.ts` are emitted.

---

## Dev Notes

### File paths to create

```
packages/shared/
├── src/
│   ├── validators/
│   │   ├── chain.ts
│   │   ├── chain.test.ts
│   │   ├── suggestion.ts
│   │   └── suggestion.test.ts
│   └── index.ts
├── tsdown.config.ts
└── vitest.config.ts
```

Files to modify:
- `packages/shared/package.json` — add `"private": true`, update `build` script

---

### Zod version

The `package.json` already declares `"zod": "^3.0.0"` under `dependencies`. Do not change this version. Use standard Zod v3 API throughout — `z.string()`, `z.enum()`, `z.object()`, `.optional()`, `.default()`, `.min()`, `.max()`, `.regex()`, `.uuid()`, `.int()`, `.nonnegative()`, `.datetime()`.

---

### Full schema implementations

#### `packages/shared/src/validators/chain.ts`

```typescript
import { z } from "zod";

export const CreateChainSchema = z.object({
  purpose: z.string().min(1).max(2000),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
      message:
        "Slug must be 3-50 characters, lowercase alphanumeric and hyphens only, cannot start or end with a hyphen",
    })
    .optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  identityType: z.enum(["oauth", "external", "anonymous"]),
  externalIdentifier: z.string().max(500).optional(),
  hashAlgorithm: z.string().default("sha256"),
  signatureScheme: z.string().default("ed25519"),
  externalAnchor: z
    .object({
      chainType: z.string(),
      blockHash: z.string(),
      blockHeight: z.number().int().nonnegative(),
      networkId: z.string(),
    })
    .optional(),
});

export type CreateChainInput = z.infer<typeof CreateChainSchema>;

export const AppendBlockSchema = z.object({
  chainId: z.string().uuid(),
  content: z.string().min(1).max(50000),
  timestamp: z.string().datetime(),
  publicKey: z.string().optional(),
  signature: z.string().optional(),
});

export type AppendBlockInput = z.infer<typeof AppendBlockSchema>;
```

**Key notes for `CreateChainSchema`:**
- `slug` regex: `^[a-z0-9][a-z0-9-]*[a-z0-9]$` — this means a 2-character input like `"ab"` satisfies `[a-z0-9]` at start and end with `[a-z0-9-]*` matching empty, but min(3) catches it independently. However a single character like `"a"` also technically matches the regex pattern (start = `a`, end = `a`, middle `*` = empty — but `[a-z0-9][a-z0-9-]*[a-z0-9]` actually requires at least 2 characters). The min(3) constraint is the definitive lower-bound guard. Both constraints are kept for defence in depth.
- `visibility` and `hashAlgorithm` and `signatureScheme` all use `.default()` — this means `CreateChainSchema.parse({})` without these fields will produce the defaults, not fail. Only `purpose` and `identityType` are truly required (no `.optional()`, no `.default()`).
- `timestamp` in `AppendBlockSchema`: `z.string().datetime()` validates ISO 8601 datetime strings (e.g. `"2026-03-22T10:00:00.000Z"`). Zod v3's `.datetime()` requires UTC offset — bare date strings like `"2026-03-22"` will fail. This is correct per architecture (ISO 8601 datetimes everywhere).

#### `packages/shared/src/validators/suggestion.ts`

```typescript
import { z } from "zod";

export const SubmitSuggestionSchema = z.object({
  chainSlug: z.string().min(1),
  content: z.string().min(1).max(50000),
  submitterNote: z.string().max(1000).optional(),
});

export type SubmitSuggestionInput = z.infer<typeof SubmitSuggestionSchema>;
```

#### `packages/shared/src/index.ts`

```typescript
export { CreateChainSchema, AppendBlockSchema } from "./validators/chain.js";
export type { CreateChainInput, AppendBlockInput } from "./validators/chain.js";
export { SubmitSuggestionSchema } from "./validators/suggestion.js";
export type { SubmitSuggestionInput } from "./validators/suggestion.js";
```

**Note on `.js` extensions:** The project uses `"moduleResolution": "bundler"` and `"module": "ESNext"` in `tsconfig.base.json`. With `tsdown` as the bundler, TypeScript source files should use `.js` extensions in relative imports (TypeScript resolves these to `.ts` at compile time; tsdown emits the `.js` files). This is the correct ESM-native pattern for this project setup.

---

### `packages/shared/tsdown.config.ts`

```typescript
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
});
```

This produces `dist/index.js` (ESM) and `dist/index.d.ts` (declaration file), matching the `main`, `types`, and `exports` fields already declared in `package.json`.

---

### `packages/shared/vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

---

### Updated `packages/shared/package.json` — fields that change

Two changes from the Story 1.1 stub:

1. Add `"private": true` at the top level (alongside `"name"`, `"version"`, etc.)
2. Change the `build` script from `"test -f src/index.ts && tsdown || true"` to `"tsdown"`

The complete updated file should read:

```json
{
  "name": "@glory-chain/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "description": "Glory Chain shared Zod validators — consumed by apps/web server and client",
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
  "dependencies": {
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "@biomejs/biome": "latest",
    "tsdown": "latest",
    "typescript": "^5.9.0",
    "vitest": "^4.1.0"
  }
}
```

Note: `typecheck` script removes `--allowEmptyFiles 2>/dev/null || true` guards — those were stub scaffolding. Now that `src/index.ts` exists, a clean `tsc --noEmit` is correct. Also `test` script removes `--passWithNoTests` since actual tests now exist.

---

### Test approach

Use Vitest. Tests co-located with source: `chain.test.ts` next to `chain.ts`, `suggestion.test.ts` next to `suggestion.ts`.

**Pattern for every field:** Test valid value passes `.safeParse()` returning `success: true`, and test each invalid case returns `success: false` with the expected path in `error.issues[0].path`.

#### `chain.test.ts` test plan

**`CreateChainSchema` — valid base input:**
```typescript
const validCreate = {
  purpose: "Official planning decisions of Springfield City Council",
  identityType: "oauth" as const,
};
// Should parse successfully with defaults applied:
// visibility === "public", hashAlgorithm === "sha256", signatureScheme === "ed25519"
```

**`CreateChainSchema` — invalid cases to cover:**
- `purpose` missing → `error.issues[0].path` is `["purpose"]`
- `purpose` empty string `""` → path `["purpose"]` (min 1 violation)
- `purpose` exceeding 2000 chars → path `["purpose"]` (max 2000 violation)
- `identityType` missing → path `["identityType"]`
- `identityType` invalid value `"unknown"` → path `["identityType"]`
- `slug` present but too short (`"ab"`, length 2) → path `["slug"]`
- `slug` present but too long (51 char string) → path `["slug"]`
- `slug` present with uppercase chars `"MyChain"` → path `["slug"]` (regex violation)
- `slug` present starting with hyphen `"-mychain"` → path `["slug"]` (regex violation)
- `slug` present ending with hyphen `"mychain-"` → path `["slug"]` (regex violation)
- `visibility` invalid value `"restricted"` → path `["visibility"]`
- `externalIdentifier` exceeding 500 chars → path `["externalIdentifier"]`
- `externalAnchor` present but missing `blockHeight` → path `["externalAnchor", "blockHeight"]`
- `externalAnchor.blockHeight` negative integer `-1` → path `["externalAnchor", "blockHeight"]`
- `externalAnchor.blockHeight` non-integer `1.5` → path `["externalAnchor", "blockHeight"]`

**`AppendBlockSchema` — valid base input:**
```typescript
const validAppend = {
  chainId: "550e8400-e29b-41d4-a716-446655440000",
  content: "Board meeting resolution: approved new project funding.",
  timestamp: "2026-03-22T10:00:00.000Z",
};
```

**`AppendBlockSchema` — invalid cases to cover:**
- `chainId` missing → path `["chainId"]`
- `chainId` not a UUID `"not-a-uuid"` → path `["chainId"]`
- `content` missing → path `["content"]`
- `content` empty string → path `["content"]` (min 1 violation)
- `content` exceeding 50000 chars → path `["content"]`
- `timestamp` missing → path `["timestamp"]`
- `timestamp` not ISO 8601 datetime `"2026-03-22"` → path `["timestamp"]`
- `timestamp` invalid string `"not-a-date"` → path `["timestamp"]`

#### `suggestion.test.ts` test plan

**`SubmitSuggestionSchema` — valid base input:**
```typescript
const validSuggestion = {
  chainSlug: "springfield-council",
  content: "Proposed addition: meeting minutes from 2026-03-21 session.",
};
```

**`SubmitSuggestionSchema` — invalid cases to cover:**
- `chainSlug` missing → path `["chainSlug"]`
- `chainSlug` empty string → path `["chainSlug"]` (min 1 violation)
- `content` missing → path `["content"]`
- `content` empty string → path `["content"]` (min 1 violation)
- `content` exceeding 50000 chars → path `["content"]`
- `submitterNote` exceeding 1000 chars → path `["submitterNote"]`

---

### Architecture enforcement checklist

The following constraints come from `architecture.md` and `biome.json` and will be flagged at lint/typecheck time if violated. The dev agent must not introduce any of these:

| Rule | Source | Consequence if violated |
|------|--------|------------------------|
| `verbatimModuleSyntax: true` | `tsconfig.base.json` | All type-only imports must use `import type`. Using `import { z } from "zod"` is fine (z is a value). Using `import { ZodObject } from "zod"` for a type-only usage must be `import type { ZodObject }`. |
| `noConsole: "error"` | `biome.json` | Any `console.log`, `console.warn`, `console.error` in library source will fail `biome check`. |
| `noExplicitAny: "error"` | `biome.json` | Any `any` type annotation causes lint failure. Use `unknown` and narrow. |
| `noUnusedImports: "error"` | `biome.json` | All imports must be used. Do not import Zod types that are only re-exported via `z.infer` without direct reference. |
| `useConst: "error"` | `biome.json` | All module-level declarations must use `const`, not `let`. |
| No internal path exports | `architecture.md` | `package.json` exports must expose only `"."`. No consumer should ever import `@glory-chain/shared/validators/chain`. |
| No `@glory-chain/core` dependency | `architecture.md` | `packages/shared` is a standalone Zod-only package. Do not add `@glory-chain/core` as a dependency. |
| ESM `.js` extensions in relative imports | `tsconfig.base.json` `module: ESNext` | Relative imports in `index.ts` must use `.js` extension (not `.ts`). TypeScript resolves these correctly; tsdown emits them. |

---

### Why `packages/shared` has no dependency on `@glory-chain/core`

`packages/shared` is consumed by both the Next.js server (Node.js runtime) and the browser client (React components using React Hook Form). `@glory-chain/core` will contain Node.js crypto operations and must never be imported in browser code. Keeping `packages/shared` as a pure Zod package ensures it is safe to import on any surface without runtime environment constraints.

---

### `externalAnchor` — reserved field note

`CreateChainSchema` includes `externalAnchor` as an optional object field. Per FR59 and PRD schema notes, this field is reserved in MVP 1 — the schema stores and surfaces it, but active verification against an external chain is a Phase 3 capability. The Zod schema validates its structure if present but no business logic in this story depends on it being set.

---

### Build output verification

After `pnpm turbo build --filter=@glory-chain/shared`, confirm the following exist:

```
packages/shared/dist/index.js          # ESM bundle
packages/shared/dist/index.d.ts        # TypeScript declarations
packages/shared/dist/index.js.map      # source map
packages/shared/dist/index.d.ts.map    # declaration map
```

The `package.json` `exports` field already maps `"."` to `dist/index.js` and `dist/index.d.ts`. No changes to the exports map are needed.

---

## Project Structure Notes

### What this story creates

- `packages/shared/src/validators/chain.ts` — `CreateChainSchema` and `AppendBlockSchema`
- `packages/shared/src/validators/chain.test.ts` — unit tests for chain validators
- `packages/shared/src/validators/suggestion.ts` — `SubmitSuggestionSchema`
- `packages/shared/src/validators/suggestion.test.ts` — unit tests for suggestion validator
- `packages/shared/src/index.ts` — sole public export surface
- `packages/shared/tsdown.config.ts` — ESM build config
- `packages/shared/vitest.config.ts` — test runner config
- Modified: `packages/shared/package.json` — adds `"private": true`, fixes build script

### What remains for later stories

- `apps/web` does not exist yet. The schemas created here will be consumed by:
  - `apps/web/server/routers/chain.ts` — tRPC `create` and `append` procedures use `CreateChainSchema` and `AppendBlockSchema` as `.input()` validators
  - `apps/web/server/routers/suggestion.ts` — tRPC `submit` procedure uses `SubmitSuggestionSchema` as `.input()` validator
  - `apps/web/components/forms/CreateChainForm.tsx` — React Hook Form `resolver` uses `CreateChainSchema` for client-side validation
  - `apps/web/components/forms/AppendBlockForm.tsx` — React Hook Form `resolver` uses `AppendBlockSchema`
  - `apps/web/components/forms/SuggestBlockForm.tsx` — React Hook Form `resolver` uses `SubmitSuggestionSchema`
- `@glory-chain/core` block schema (`packages/core/src/schema/block.ts`) is a separate concern — it defines the wire-format `Block` and `GenesisBlock` types used by the chain engine. The `packages/shared` schemas are API input validation schemas for the SaaS web layer, not protocol types.
- No database schema (Drizzle) is created in this story — that belongs to the `apps/web` stories.
- The `externalAnchor` field's active verification logic is deferred to Phase 3 (FR60).

---

## References

- `architecture.md` — "Data Architecture" section: "Shared Zod schemas between SaaS API and web UI via a `packages/shared` package"
- `architecture.md` — "Project Structure & Boundaries": `packages/shared/` annotated as "internal — Zod schemas shared between web + API"
- `architecture.md` — "Naming Patterns" / "TypeScript (all packages)": "Zod schemas: `PascalCase` + `Schema` suffix"
- `architecture.md` — "Enforcement": "Import from package `index.ts` only — never from internal paths"
- `architecture.md` — "Enforcement": "Never: Use `any` — use `unknown` and narrow"
- `architecture.md` — "Enforcement": "Never: Write `console.log` in library package source"
- `architecture.md` — "Frontend Architecture": "React Hook Form + Zod — standard shadcn/ui form pattern. Zod schemas shared from `packages/shared`"
- `prd.md` — FR1 (create chain), FR2 (append block), FR36–FR38 (identity types), FR40 (web UI create chain), FR41 (web UI append block), FR42 (chain slug), FR44 (visibility), FR45 (suggestion queue), FR59 (externalAnchor reserved field)
- `prd.md` — "Schema note (MVP 1)": `externalAnchor?: { chainType, blockHash, blockHeight, networkId }` reserved in genesis schema

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
