# Story 3.1 — FsConnector Implementation

**Story ID:** 3.1
**Story Key:** `3-1-fsconnector-implementation`
**Epic:** 3 — File System Connector
**Status:** done
**Created:** 2026-03-22

---

## Story

As a developer using Glory Chain, I want a `FsConnector` class in `packages/fs` that implements the full `Connector` interface, so that I can persist and retrieve chains as JSON files on disk using the same versioned contract that all connectors share.

---

## Background and Context

Epic 2 delivered `@glory-chain/core` with all types, crypto, chain lifecycle, and verification. This story implements the first persistence connector.

**FR15** — chains stored as JSON files on disk
**FR18** — `watch()` emits `ThreatEvent` on anomalies; never throws
**FR19** — `read()` / `write()` are the primary persistence operations
**FR20** — `Connector` interface is the versioned contract; all connectors implement it

### Storage format

Each chain is stored as a single JSON file: `{chainId}.json`
The JSON structure mirrors the `Chain` type:
```json
{
  "metadata": { ... },
  "blocks": [ ... ]
}
```

The base directory is configured at construction time. `read(chainId)` reads `{dir}/{chainId}.json`. `write(chain)` writes `{dir}/{chain.metadata.chainId}.json` (idempotent — writing same chain twice is safe).

### watch() — async generator

`watch(chainId)` returns an `AsyncIterable<ThreatEvent>` that polls the chain file every 2 seconds and emits a `ThreatEvent` if the file is missing or has been externally modified (hash of file contents changes). Never throws — all errors become `ThreatEvent` with type `UNEXPECTED_ERROR`.

Story 3.2 will flesh out the full threat detection. For this story, `watch()` must return a valid `AsyncIterable` that emits `FILE_MISSING` if the file doesn't exist when first checked. The polling loop is implemented in Story 3.2.

### migrate()

`migrate(chainId, target)` reads the chain, records a migration event via `migrateChain()`, then calls `target.write(updatedChain)`. Returns after target write completes.

### verify()

Delegates to `verifyChain(chain)` from `@glory-chain/core`. Reads the chain first, then verifies.

---

## Acceptance Criteria

### AC-1: File Structure
- `packages/fs/src/connector.ts` — FsConnector class
- `packages/fs/src/index.ts` — re-exports
- `packages/fs/src/connector.test.ts` — integration tests using real temp directory

### AC-2: FsConnector implements Connector interface
All 5 methods + `version` property present and typed correctly.

### AC-3: read() and write() round-trip
Write a chain, read it back, contents match.

### AC-4: write() is idempotent
Writing the same chain twice produces the same file (no error, no corruption).

### AC-5: migrate() records migration event
After `migrate()`, the target connector has the chain with a new migration event in `migrationHistory`.

### AC-6: verify() delegates to verifyChain
Returns `VerificationResult` from `@glory-chain/core`.

### AC-7: watch() returns AsyncIterable
`watch()` returns an object with `[Symbol.asyncIterator]`. Full threat detection in Story 3.2.

### AC-8: Package scripts updated
`build`, `test`, `typecheck` scripts updated from stubs to real commands.

### AC-9: Full pipeline passes
`pnpm turbo build test typecheck lint --filter=@glory-chain/fs` exits 0.

---

## Tasks

### Task 1: Update packages/fs/package.json — real scripts, add @types/node
### Task 2: Add tsdown.config.ts and vitest.config.ts
### Task 3: Create packages/fs/src/connector.ts
### Task 4: Create packages/fs/src/index.ts
### Task 5: Create packages/fs/src/connector.test.ts (integration tests with real tmpdir)
### Task 6: Run full pipeline

---

## Dev Notes

### tmpdir for tests

Use `node:os` `tmpdir()` + `node:crypto` `randomUUID()` to create unique test directories. Clean up in `afterEach` using `node:fs/promises` `rm({ recursive: true })`.

```typescript
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

let testDir: string;
beforeEach(async () => {
  testDir = join(tmpdir(), `glory-chain-test-${randomUUID()}`);
  await mkdir(testDir, { recursive: true });
});
afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});
```

### JSON serialization

`JSON.stringify(chain, null, 2)` for readable output. `JSON.parse(await readFile(path, 'utf8')) as Chain` for reading. No validation — the Connector contract assumes valid chains are written and read.

### watch() minimal implementation for Story 3.1

Return an async generator that checks once if the file exists, emits `FILE_MISSING` if not, then yields nothing (exits). Story 3.2 adds the polling loop.

```typescript
async *watch(chainId: string): AsyncIterable<ThreatEvent> {
  const filePath = join(this.dir, `${chainId}.json`);
  try {
    await access(filePath);
  } catch {
    const event: ThreatEvent = {
      type: 'FILE_MISSING',
      chainId,
      timestamp: new Date().toISOString() as ISO8601,
      detail: `Chain file not found: ${filePath}`,
    };
    yield event;
  }
}
```

---

## Complete Implementation

### packages/fs/package.json (updated)

```json
{
  "name": "@glory-chain/fs",
  "version": "0.0.1",
  "type": "module",
  "description": "Glory Chain file system connector",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsdown",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "test": "vitest run"
  },
  "dependencies": {
    "@glory-chain/core": "workspace:*"
  },
  "devDependencies": {
    "@biomejs/biome": "latest",
    "@types/node": "^22.0.0",
    "tsdown": "latest",
    "typescript": "^5.9.0",
    "vitest": "^4.1.0"
  }
}
```

### packages/fs/tsconfig.json (updated)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### packages/fs/tsdown.config.ts

```typescript
import { defineConfig } from "tsdown";
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["@glory-chain/core"],
});
```

### packages/fs/vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
});
```

### packages/fs/src/connector.ts

```typescript
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import {
  migrateChain,
  verifyChain,
} from "@glory-chain/core";
import type {
  Chain,
  Connector,
  ISO8601,
  ThreatEvent,
  VerificationResult,
} from "@glory-chain/core";

export class FsConnector implements Connector {
  readonly version = "0.0.1";

  constructor(private readonly dir: string) {}

  async read(chainId: string): Promise<Chain> {
    const filePath = join(this.dir, `${chainId}.json`);
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as Chain;
  }

  async write(chain: Chain): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const filePath = join(this.dir, `${chain.metadata.chainId}.json`);
    await writeFile(filePath, JSON.stringify(chain, null, 2), "utf8");
  }

  async *watch(chainId: string): AsyncIterable<ThreatEvent> {
    const filePath = join(this.dir, `${chainId}.json`);
    try {
      await access(filePath);
    } catch {
      const event: ThreatEvent = {
        type: "FILE_MISSING",
        chainId,
        timestamp: new Date().toISOString() as ISO8601,
        detail: `Chain file not found: ${filePath}`,
      };
      yield event;
    }
  }

  async migrate(chainId: string, target: Connector): Promise<void> {
    const chain = await this.read(chainId);
    const updated = migrateChain(chain, "fs", target.version);
    await target.write(updated);
  }

  async verify(chainId: string): Promise<VerificationResult> {
    const chain = await this.read(chainId);
    return verifyChain(chain);
  }
}
```

### packages/fs/src/index.ts

```typescript
export { FsConnector } from "./connector.js";
```

### packages/fs/src/connector.test.ts

```typescript
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendBlock, createChain, generateKeypair } from "@glory-chain/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FsConnector } from "./connector.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `glory-chain-test-${randomUUID()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

function makeChain() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain = createChain(
    { content: "genesis", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.value.publicKey },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  return { chain: chain.value, kp: kp.value };
}

describe("FsConnector", () => {
  it("write and read round-trip preserves chain", async () => {
    const { chain } = makeChain();
    const connector = new FsConnector(testDir);
    await connector.write(chain);
    const read = await connector.read(chain.metadata.chainId);
    expect(read.metadata.chainId).toBe(chain.metadata.chainId);
    expect(read.blocks.length).toBe(chain.blocks.length);
    expect(read.blocks[0]?.hash).toBe(chain.blocks[0]?.hash);
  });

  it("write is idempotent", async () => {
    const { chain } = makeChain();
    const connector = new FsConnector(testDir);
    await connector.write(chain);
    await connector.write(chain);
    const read = await connector.read(chain.metadata.chainId);
    expect(read.metadata.chainId).toBe(chain.metadata.chainId);
  });

  it("verify returns valid: true for untampered chain", async () => {
    const { chain } = makeChain();
    const connector = new FsConnector(testDir);
    await connector.write(chain);
    const result = await connector.verify(chain.metadata.chainId);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("migrate records migration event in target", async () => {
    const { chain } = makeChain();
    const source = new FsConnector(testDir);
    const targetDir = join(testDir, "target");
    const target = new FsConnector(targetDir);
    await source.write(chain);
    await source.migrate(chain.metadata.chainId, target);
    const migrated = await target.read(chain.metadata.chainId);
    expect(migrated.metadata.migrationHistory.length).toBe(1);
    expect(migrated.metadata.migrationHistory[0]?.fromConnector).toBe("fs");
  });

  it("watch emits FILE_MISSING for nonexistent chain", async () => {
    const connector = new FsConnector(testDir);
    const events: string[] = [];
    for await (const event of connector.watch("nonexistent-chain-id")) {
      events.push(event.type);
    }
    expect(events).toContain("FILE_MISSING");
  });

  it("watch emits nothing for existing chain", async () => {
    const { chain } = makeChain();
    const connector = new FsConnector(testDir);
    await connector.write(chain);
    const events: string[] = [];
    for await (const event of connector.watch(chain.metadata.chainId)) {
      events.push(event.type);
    }
    expect(events).toEqual([]);
  });

  it("read multi-block chain preserves all blocks", async () => {
    const { chain: genesis, kp } = makeChain();
    const r1 = appendBlock(genesis, { content: "block 1", publicKey: kp.publicKey }, kp.privateKey);
    if (!r1.ok) throw new Error("appendBlock failed");
    const connector = new FsConnector(testDir);
    await connector.write(r1.value);
    const read = await connector.read(r1.value.metadata.chainId);
    expect(read.blocks.length).toBe(2);
    expect(read.blocks[1]?.content).toBe("block 1");
  });
});
```

---

## Traceability

| AC | Requirement |
|----|-------------|
| read/write JSON | FR15, FR19 |
| watch AsyncIterable | FR18 |
| migrate records event | FR6 |
| verify delegates to verifyChain | FR3, FR4 |
| Connector interface | FR20 |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### File List
- `packages/fs/package.json` (updated)
- `packages/fs/tsconfig.json` (updated)
- `packages/fs/tsdown.config.ts`
- `packages/fs/vitest.config.ts`
- `packages/fs/src/connector.ts`
- `packages/fs/src/index.ts`
- `packages/fs/src/connector.test.ts`
