# Story 3.3 — Integration Tests

**Story ID:** 3.3
**Story Key:** `3-3-integration-tests`
**Epic:** 3 — File System Connector
**Status:** ready-for-dev
**Created:** 2026-03-22

---

## Story

As a developer using Glory Chain, I want `packages/fs/tests/integration/connector.integration.test.ts` to exercise the full FsConnector lifecycle against a real filesystem, so that the connector's behaviour is validated end-to-end without any mocking.

---

## Background and Context

Stories 3.1 and 3.2 added unit/integration tests in `src/`. This story adds a dedicated integration test file that exercises the full connector lifecycle: write → read → verify → migrate → watch (threat detection). Uses real tmpdir, no mocks.

---

## Acceptance Criteria

### AC-1: File location
`packages/fs/tests/integration/connector.integration.test.ts`

### AC-2: create + read round-trip
Write a chain, read it back, all fields preserved.

### AC-3: idempotent write
Write the same chain twice — no error, file contents identical.

### AC-4: migration event
Migrate chain from source to target FsConnector — target chain has migrationHistory entry.

### AC-5: threat detection — FILE_MISSING
Watch a chain that doesn't exist — FILE_MISSING event emitted.

### AC-6: threat detection — FILE_MODIFIED
Watch a chain, externally modify its file — FILE_MODIFIED event emitted.

### AC-7: Full pipeline passes

---

## Tasks

### Task 1: Create tests/integration/ directory structure
### Task 2: Write connector.integration.test.ts
### Task 3: Update vitest.config.ts to include tests/ directory
### Task 4: Run full pipeline

---

## Dev Notes

The test file mirrors what is already tested in `src/connector.test.ts` and `src/watch.test.ts` but lives in a dedicated integration tests directory to establish the pattern for future connectors (GitHub connector in Story 5.4 follows the same layout).

The `collectEvents` helper from watch.test.ts should be copied into the integration test file (or extracted to a shared test utility — but keep it simple for now, copy is fine).

vitest.config.ts needs `include` updated to also pick up `tests/**/*.test.ts`.

---

## Complete Implementation

### packages/fs/vitest.config.ts (updated)

```typescript
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
});
```

### packages/fs/tests/integration/connector.integration.test.ts

```typescript
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createChain, generateKeypair } from "@glory-chain/core";
import type { ThreatEvent } from "@glory-chain/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FsConnector } from "../../src/connector.js";

const POLL_MS = 100;

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `glory-chain-integration-${randomUUID()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

async function collectEvents(
  iterable: AsyncIterable<ThreatEvent>,
  count: number,
  timeoutMs: number,
): Promise<ThreatEvent[]> {
  const events: ThreatEvent[] = [];
  const iter = iterable[Symbol.asyncIterator]();
  const deadline = Date.now() + timeoutMs;
  while (events.length < count) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const result = await Promise.race([
      iter.next(),
      new Promise<IteratorResult<ThreatEvent, undefined>>((resolve) =>
        setTimeout(() => resolve({ value: undefined, done: true }), remaining),
      ),
    ]);
    if (result.done) break;
    events.push(result.value);
  }
  void iter.return?.();
  return events;
}

function makeChain() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain = createChain(
    {
      content: "integration test genesis",
      purpose: "integration-test",
      creatorId: "test-user",
      identityType: "anonymous",
      publicKey: kp.value.publicKey,
    },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  return chain.value;
}

describe("FsConnector integration", () => {
  it("write → read round-trip preserves all fields", async () => {
    const chain = makeChain();
    const connector = new FsConnector(testDir);
    await connector.write(chain);
    const read = await connector.read(chain.metadata.chainId);
    expect(read.metadata.chainId).toBe(chain.metadata.chainId);
    expect(read.metadata.protocolVersion).toBe(chain.metadata.protocolVersion);
    expect(read.blocks.length).toBe(chain.blocks.length);
    expect(read.blocks[0]?.hash).toBe(chain.blocks[0]?.hash);
    expect(read.blocks[0]?.signature).toBe(chain.blocks[0]?.signature);
  });

  it("write is idempotent — no error, stable file", async () => {
    const chain = makeChain();
    const connector = new FsConnector(testDir);
    await connector.write(chain);
    await connector.write(chain);
    const read = await connector.read(chain.metadata.chainId);
    expect(read.metadata.chainId).toBe(chain.metadata.chainId);
    expect(read.blocks.length).toBe(1);
  });

  it("verify returns valid for untampered chain", async () => {
    const chain = makeChain();
    const connector = new FsConnector(testDir);
    await connector.write(chain);
    const result = await connector.verify(chain.metadata.chainId);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("migrate records migration event in target connector", async () => {
    const chain = makeChain();
    const source = new FsConnector(testDir);
    const targetDir = join(testDir, "target");
    const target = new FsConnector(targetDir);
    await source.write(chain);
    await source.migrate(chain.metadata.chainId, target);
    const migrated = await target.read(chain.metadata.chainId);
    expect(migrated.metadata.migrationHistory.length).toBe(1);
    expect(migrated.metadata.migrationHistory[0]?.fromConnector).toBe("fs");
    expect(migrated.metadata.migrationHistory[0]?.toConnector).toBe("fs");
  });

  it("watch emits FILE_MISSING for nonexistent chain", async () => {
    const connector = new FsConnector(testDir, { pollIntervalMs: POLL_MS });
    const events = await collectEvents(connector.watch("ghost-chain"), 1, 1000);
    expect(events[0]?.type).toBe("FILE_MISSING");
    expect(events[0]?.chainId).toBe("ghost-chain");
  });

  it("watch emits FILE_MODIFIED when file is externally tampered", async () => {
    const chain = makeChain();
    const connector = new FsConnector(testDir, { pollIntervalMs: POLL_MS });
    await connector.write(chain);
    const filePath = join(testDir, `${chain.metadata.chainId}.json`);

    const watchIterable = connector.watch(chain.metadata.chainId);
    setTimeout(
      () => writeFile(filePath, '{"tampered":true}', "utf8").catch(() => {}),
      POLL_MS + 20,
    );
    const events = await collectEvents(watchIterable, 1, 1500);
    expect(events[0]?.type).toBe("FILE_MODIFIED");
    expect(events[0]?.chainId).toBe(chain.metadata.chainId);
  });
});
```

---

## Traceability

| AC | Requirement |
|----|-------------|
| write/read round-trip | FR15, FR19 |
| idempotent write | FR19 |
| migration event | FR6 |
| FILE_MISSING threat | FR18 |
| FILE_MODIFIED threat | FR18 |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### File List
- `packages/fs/vitest.config.ts` (updated)
- `packages/fs/tests/integration/connector.integration.test.ts`
