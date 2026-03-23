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
import { CreateChainSchema, AppendBlockSchema, ForkChainSchema } from "@glorychain/shared";
import type { CreateChainInput, AppendBlockInput, ForkChainInput } from "@glorychain/shared";

// Validate input before creating a chain
const input = CreateChainSchema.parse({
  name:    "Acme NGO Board Decisions",
  purpose: "Tamper-evident public record of all governance decisions",
});

// Validate input before appending a block
const appendInput = AppendBlockSchema.parse({
  chainId:   "3e7c9f2a-...",
  content:   "Motion passed: Approve 2026 budget. Votes: 7 for, 0 against.",
  publicKey: "MCowBQYDK2V...",
});
```

---

## Suggestion validators

The SaaS platform supports a suggestion workflow — anyone can propose a block for a chain; the chain owner approves or rejects it.

```typescript
import { SubmitSuggestionSchema, ReviewSuggestionSchema } from "@glorychain/shared";
import type { SubmitSuggestionInput, ReviewSuggestionInput } from "@glorychain/shared";

// Submit a suggestion (public — no auth required)
const suggestion = SubmitSuggestionSchema.parse({
  chainId:          "3e7c9f2a-...",
  proposedContent:  "Proposed board resolution: ...",
  proposerPublicKey: "MCowBQYDK2V...",
});

// Review a suggestion (chain owner only)
const review = ReviewSuggestionSchema.parse({
  suggestionId: "abc123",
  action:       "approved",  // "approved" | "rejected"
});
```

---

## All exports

```typescript
// Schemas
export {
  CreateChainSchema,
  AppendBlockSchema,
  ForkChainSchema,
  MigrateChainSchema,
  SubmitSuggestionSchema,
  ReviewSuggestionSchema,
};

// Types (derived from schemas via z.infer)
export type {
  CreateChainInput,
  AppendBlockInput,
  ForkChainInput,
  MigrateChainInput,
  SubmitSuggestionInput,
  ReviewSuggestionInput,
};
```

---

## Design

- **No runtime dependencies beyond `zod`** — installs cleanly in any environment
- **Validators are canonical** — the Zod schemas define the contract; TypeScript types are derived from them via `z.infer`, never written by hand
- **Used everywhere** — CLI flags → parsed through these validators. tRPC inputs → these schemas. API request bodies → these schemas. One source of truth.
- **Pure ESM** — tree-shakeable, no CJS interop issues
