# @glorychain/shared

> Zod validators and shared TypeScript types used across all glorychain packages and the web platform.

```bash
npm install @glorychain/shared
# or
pnpm add @glorychain/shared
```

This package is the single source of truth for input shapes. The same validators run in CLI commands, API route handlers, and tRPC procedures — so a chain created from the CLI and one created via the web API have identical validation semantics.

---

## Chain validators

```typescript
import { CreateChainSchema, AppendBlockSchema } from "@glorychain/shared";
import type { CreateChainInput, AppendBlockInput } from "@glorychain/shared";

// Validate input before creating a chain
const input = CreateChainSchema.parse({
  purpose:      "Tamper-evident public record of all governance decisions",
  identityType: "anonymous",  // "oauth" | "external" | "anonymous"
});

// Validate input before appending a block
const appendInput = AppendBlockSchema.parse({
  chainId:   "3e7c9f2a-...",
  content:   "Motion passed: Approve 2026 budget. Votes: 7 for, 0 against.",
  timestamp: new Date().toISOString(),
});
```

---

## Suggestion validators

The SaaS platform supports a suggestion workflow — anyone can propose a block for a chain; the chain owner approves or rejects it.

```typescript
import { SubmitSuggestionSchema } from "@glorychain/shared";
import type { SubmitSuggestionInput } from "@glorychain/shared";

// Submit a suggestion (public — no auth required)
const suggestion = SubmitSuggestionSchema.parse({
  chainSlug:     "acme-ngo-board-resolutions",
  content:       "Proposed board resolution: ...",
  submitterNote: "From the finance committee.",  // optional
});
```

---

## All exports

```typescript
// Schemas
export {
  CreateChainSchema,
  AppendBlockSchema,
  ContentSchemaDefinitionSchema,
  SubmitSuggestionSchema,
};

// Types (derived from schemas via z.infer)
export type {
  CreateChainInput,
  AppendBlockInput,
  ContentSchemaDefinition,
  SubmitSuggestionInput,
};
```

---

## Design

- **No runtime dependencies beyond `zod`** — installs cleanly in any environment
- **Validators are canonical** — the Zod schemas define the contract; TypeScript types are derived from them via `z.infer`, never written by hand
- **Used everywhere** — CLI flags → parsed through these validators. tRPC inputs → these schemas. API request bodies → these schemas. One source of truth.
- **Pure ESM** — tree-shakeable, no CJS interop issues
