# Story 5.2 — Conformance Test Suites

**Story ID:** 5.2
**Story Key:** `5-2-conformance-test-suites`
**Epic:** 5 — Conformance CLI and GitHub Connector
**Status:** ready-for-dev
**Created:** 2026-03-22

---

## Story

As a third-party implementor of the Glory Chain protocol, I want concrete conformance suites for genesis, append, verify, fork, and replay attack prevention so that I can verify my implementation is interoperable with the spec.

---

## Background and Context

Story 5.1 scaffolded the runner. This story adds the actual test suites in `apps/conformance/src/suites/`:
- `genesis.ts` — genesis block creation and structure validation
- `append.ts` — block append, hash linkage
- `verify.ts` — chain verification (FR54 — verification engine)
- `fork.ts` — chain forking
- `replay.ts` — replay attack prevention (FR12 — chainId in block payload)

The suites import from `@glory-chain/core` (the reference implementation). A third-party implementation would replace these imports with their own impl.

The `apps/conformance/package.json` must add `@glory-chain/core` as a dev dependency.

---

## Acceptance Criteria

### AC-1: genesis suite
Tests: genesis block has blockNumber 0, correct chainId, valid hash, valid signature, correct fields.

### AC-2: append suite
Tests: appended block has correct blockNumber, previousHash matches genesis hash, hash/signature valid.

### AC-3: verify suite
Tests: valid chain returns `{ valid: true }`, tampered chain returns `{ valid: false }`.

### AC-4: fork suite
Tests: forked chain has blockNumber 0, forkOf references source chain.

### AC-5: replay suite
Tests: block from chain A cannot be replayed into chain B (different chainId in canonical payload).

### AC-6: index.ts updated to use real suites
Replace placeholderSuites with allSuites combining all five.

### AC-7: Full pipeline passes

---

## Complete Implementation

### apps/conformance/package.json (updated devDependencies)

Add:
```json
"@glory-chain/core": "workspace:*"
```

### apps/conformance/src/suites/genesis.ts

```typescript
import { createChain, generateKeypair, verifyChain } from "@glory-chain/core";
import type { Suite } from "../runner.js";

export const genesisSuites: Suite[] = [
  {
    name: "genesis: blockNumber is 0",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name: "genesis: blockNumber is 0", error: "keygen failed" };
      const result = createChain({ content: "hello", purpose: "test", creatorId: "tester", identityType: "anonymous", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!result.ok) return { passed: false, name: "genesis: blockNumber is 0", error: result.error.message };
      const passed = result.value.blocks[0]?.blockNumber === 0;
      return { passed, name: "genesis: blockNumber is 0", ...(passed ? {} : { error: `expected 0, got ${result.value.blocks[0]?.blockNumber}` }) };
    },
  },
  {
    name: "genesis: chain verifies as valid",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name: "genesis: chain verifies as valid", error: "keygen failed" };
      const result = createChain({ content: "hello", purpose: "test", creatorId: "tester", identityType: "anonymous", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!result.ok) return { passed: false, name: "genesis: chain verifies as valid", error: result.error.message };
      const verification = verifyChain(result.value);
      return { passed: verification.valid, name: "genesis: chain verifies as valid", ...(verification.valid ? {} : { error: verification.errors.join(", ") }) };
    },
  },
];
```

### apps/conformance/src/suites/append.ts

```typescript
import { appendBlock, createChain, generateKeypair, verifyChain } from "@glory-chain/core";
import type { Suite } from "../runner.js";

export const appendSuites: Suite[] = [
  {
    name: "append: second block has blockNumber 1",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name: "append: second block has blockNumber 1", error: "keygen failed" };
      const chain = createChain({ content: "genesis", purpose: "test", creatorId: "tester", identityType: "anonymous", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!chain.ok) return { passed: false, name: "append: second block has blockNumber 1", error: chain.error.message };
      const appended = appendBlock(chain.value, { content: "block 1", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!appended.ok) return { passed: false, name: "append: second block has blockNumber 1", error: appended.error.message };
      const passed = appended.value.blocks[1]?.blockNumber === 1;
      return { passed, name: "append: second block has blockNumber 1" };
    },
  },
  {
    name: "append: previousHash matches genesis hash",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name: "append: previousHash matches genesis hash", error: "keygen failed" };
      const chain = createChain({ content: "genesis", purpose: "test", creatorId: "tester", identityType: "anonymous", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!chain.ok) return { passed: false, name: "append: previousHash matches genesis hash", error: chain.error.message };
      const appended = appendBlock(chain.value, { content: "block 1", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!appended.ok) return { passed: false, name: "append: previousHash matches genesis hash", error: appended.error.message };
      const genesisHash = appended.value.blocks[0]?.hash;
      const prevHash = appended.value.blocks[1]?.previousHash;
      const passed = genesisHash === prevHash;
      return { passed, name: "append: previousHash matches genesis hash", ...(passed ? {} : { error: `genesis=${genesisHash}, prev=${prevHash}` }) };
    },
  },
  {
    name: "append: multi-block chain verifies as valid",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name: "append: multi-block chain verifies as valid", error: "keygen failed" };
      const chain = createChain({ content: "genesis", purpose: "test", creatorId: "tester", identityType: "anonymous", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!chain.ok) return { passed: false, name: "append: multi-block chain verifies as valid", error: chain.error.message };
      const appended = appendBlock(chain.value, { content: "block 1", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!appended.ok) return { passed: false, name: "append: multi-block chain verifies as valid", error: appended.error.message };
      const verification = verifyChain(appended.value);
      return { passed: verification.valid, name: "append: multi-block chain verifies as valid", ...(verification.valid ? {} : { error: verification.errors.join(", ") }) };
    },
  },
];
```

### apps/conformance/src/suites/verify.ts

```typescript
import { appendBlock, createChain, generateKeypair, verifyChain } from "@glory-chain/core";
import type { Chain } from "@glory-chain/core";
import type { Suite } from "../runner.js";

export const verifySuites: Suite[] = [
  {
    name: "verify: valid chain returns valid=true",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name: "verify: valid chain returns valid=true", error: "keygen failed" };
      const chain = createChain({ content: "valid", purpose: "test", creatorId: "tester", identityType: "anonymous", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!chain.ok) return { passed: false, name: "verify: valid chain returns valid=true", error: chain.error.message };
      const result = verifyChain(chain.value);
      return { passed: result.valid, name: "verify: valid chain returns valid=true" };
    },
  },
  {
    name: "verify: tampered content returns valid=false",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name: "verify: tampered content returns valid=false", error: "keygen failed" };
      const chain = createChain({ content: "original", purpose: "test", creatorId: "tester", identityType: "anonymous", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!chain.ok) return { passed: false, name: "verify: tampered content returns valid=false", error: chain.error.message };
      // Tamper with genesis content
      const tampered: Chain = {
        ...chain.value,
        blocks: [{ ...chain.value.blocks[0]!, content: "tampered" }, ...chain.value.blocks.slice(1)] as Chain["blocks"],
      };
      const result = verifyChain(tampered);
      return { passed: !result.valid, name: "verify: tampered content returns valid=false", ...(result.valid ? { error: "expected invalid but got valid" } : {}) };
    },
  },
];
```

### apps/conformance/src/suites/fork.ts

```typescript
import { createChain, forkChain, generateKeypair } from "@glory-chain/core";
import type { Suite } from "../runner.js";

export const forkSuites: Suite[] = [
  {
    name: "fork: forked chain has blockNumber 0",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name: "fork: forked chain has blockNumber 0", error: "keygen failed" };
      const source = createChain({ content: "source", purpose: "test", creatorId: "tester", identityType: "anonymous", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!source.ok) return { passed: false, name: "fork: forked chain has blockNumber 0", error: source.error.message };
      const forked = forkChain(source.value, 0, { content: "fork", purpose: "fork-test", creatorId: "tester", identityType: "anonymous", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!forked.ok) return { passed: false, name: "fork: forked chain has blockNumber 0", error: forked.error.message };
      const passed = forked.value.blocks[0]?.blockNumber === 0;
      return { passed, name: "fork: forked chain has blockNumber 0" };
    },
  },
  {
    name: "fork: forked chain has different chainId than source",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name: "fork: forked chain has different chainId than source", error: "keygen failed" };
      const source = createChain({ content: "source", purpose: "test", creatorId: "tester", identityType: "anonymous", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!source.ok) return { passed: false, name: "fork: forked chain has different chainId than source", error: source.error.message };
      const forked = forkChain(source.value, 0, { content: "fork", purpose: "fork-test", creatorId: "tester", identityType: "anonymous", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!forked.ok) return { passed: false, name: "fork: forked chain has different chainId than source", error: forked.error.message };
      const passed = forked.value.metadata.chainId !== source.value.metadata.chainId;
      return { passed, name: "fork: forked chain has different chainId than source" };
    },
  },
];
```

### apps/conformance/src/suites/replay.ts

```typescript
import { appendBlock, createChain, generateKeypair, verifyChain } from "@glory-chain/core";
import type { Chain } from "@glory-chain/core";
import type { Suite } from "../runner.js";

export const replaySuites: Suite[] = [
  {
    name: "replay: block from chain A injected into chain B fails verification (FR12)",
    run: async () => {
      const kp = generateKeypair();
      if (!kp.ok) return { passed: false, name: "replay: block from chain A injected into chain B fails verification (FR12)", error: "keygen failed" };
      // Chain A: genesis + block 1
      const chainA = createChain({ content: "chain A genesis", purpose: "test", creatorId: "tester", identityType: "anonymous", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!chainA.ok) return { passed: false, name: "replay: block from chain A injected into chain B fails verification (FR12)", error: chainA.error.message };
      const chainAWith2 = appendBlock(chainA.value, { content: "chain A block 1", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!chainAWith2.ok) return { passed: false, name: "replay: block from chain A injected into chain B fails verification (FR12)", error: chainAWith2.error.message };
      // Chain B: genesis only
      const chainB = createChain({ content: "chain B genesis", purpose: "test", creatorId: "tester", identityType: "anonymous", publicKey: kp.value.publicKey }, kp.value.privateKey);
      if (!chainB.ok) return { passed: false, name: "replay: block from chain A injected into chain B fails verification (FR12)", error: chainB.error.message };
      // Inject block 1 from chain A into chain B
      const replayBlock = chainAWith2.value.blocks[1]!;
      const tampered: Chain = {
        ...chainB.value,
        blocks: [chainB.value.blocks[0]!, replayBlock] as Chain["blocks"],
      };
      const result = verifyChain(tampered);
      // Should fail because chainId in block doesn't match chain B's chainId
      return { passed: !result.valid, name: "replay: block from chain A injected into chain B fails verification (FR12)", ...(result.valid ? { error: "replay attack not detected" } : {}) };
    },
  },
];
```

### apps/conformance/src/suites/index.ts

```typescript
import { appendSuites } from "./append.js";
import { forkSuites } from "./fork.js";
import { genesisSuites } from "./genesis.js";
import { replaySuites } from "./replay.js";
import { verifySuites } from "./verify.js";

export const allSuites = [
  ...genesisSuites,
  ...appendSuites,
  ...verifySuites,
  ...forkSuites,
  ...replaySuites,
];
```

### apps/conformance/src/index.ts (updated)

```typescript
import { Command } from "commander";
import { runSuites } from "./runner.js";
import { allSuites } from "./suites/index.js";

const program = new Command();

program
  .name("glory-chain-conformance")
  .description("Glory Chain protocol conformance test suite")
  .version("0.0.1");

program
  .command("run")
  .description("Run all conformance suites")
  .option("--json", "Output results as JSON instead of TAP")
  .action(async (opts: { json?: boolean }) => {
    await runSuites(allSuites, { ...(opts.json !== undefined && { json: opts.json }) });
  });

program.parse();
```

---

## Traceability

| AC | Requirement |
|----|-------------|
| genesis suite | FR9, FR10 |
| append suite | FR11 |
| verify suite | FR54 |
| fork suite | FR5 |
| replay suite | FR12 |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### File List
- `apps/conformance/package.json` (updated)
- `apps/conformance/src/index.ts` (updated)
- `apps/conformance/src/suites/genesis.ts`
- `apps/conformance/src/suites/append.ts`
- `apps/conformance/src/suites/verify.ts`
- `apps/conformance/src/suites/fork.ts`
- `apps/conformance/src/suites/replay.ts`
- `apps/conformance/src/suites/index.ts`
