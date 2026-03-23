# Story 3.2 — Threat Detection: File Watch

**Story ID:** 3.2
**Story Key:** `3-2-threat-detection-file-watch`
**Epic:** 3 — File System Connector
**Status:** ready-for-dev
**Created:** 2026-03-22

---

## Story

As a developer using Glory Chain, I want `FsConnector.watch()` to continuously poll a chain file and emit `ThreatEvent` values when the file goes missing or is externally modified, so that consumers can detect tampering in real time without coupling to Node.js `fs.watch` (which is unreliable cross-platform).

---

## Background and Context

Story 3.1 implemented a minimal `watch()` that only checks once at start. This story upgrades it to a polling loop that:
1. Checks file existence — emits `FILE_MISSING` if gone
2. Hashes the file contents on each poll — emits `FILE_MODIFIED` if hash changes from the baseline
3. Polls every 2 seconds (configurable via constructor option)
4. Never throws — all errors become `UNEXPECTED_ERROR` ThreatEvent
5. Terminates when the caller breaks out of the `for await...of` loop (async generator protocol)

**FR18** — `watch()` never throws; all anomalies emitted as `ThreatEvent`

---

## Acceptance Criteria

### AC-1: FsConnector accepts optional pollIntervalMs in constructor
```typescript
new FsConnector(dir, { pollIntervalMs: 500 }) // for tests
```

### AC-2: watch() polls continuously
After yielding each event (or no event), waits `pollIntervalMs` then checks again. Continues until the caller stops iterating.

### AC-3: FILE_MISSING emitted when file disappears
If the file existed when watch started but is later deleted, `FILE_MISSING` is emitted.

### AC-4: FILE_MODIFIED emitted when file is externally changed
If the file contents change (hash comparison), `FILE_MODIFIED` is emitted.

### AC-5: UNEXPECTED_ERROR emitted for unexpected failures
Any unexpected error (e.g. permission denied) is caught and emitted as `UNEXPECTED_ERROR` with the error message in `detail`.

### AC-6: watch() terminates cleanly when caller stops iterating
When the caller does `break` in `for await...of`, the generator stops without error.

### AC-7: Tests use fast poll interval (500ms) and real filesystem
Tests write/delete/modify files and assert the correct ThreatEvents are emitted. Use `vitest` fake timers or just short real delays.

### AC-8: Full pipeline passes

---

## Tasks

### Task 1: Update FsConnector constructor to accept options
### Task 2: Upgrade watch() to polling loop with hash comparison
### Task 3: Add watch.test.ts tests
### Task 4: Run full pipeline

---

## Dev Notes

### Polling loop pattern

```typescript
async *watch(chainId: string): AsyncIterable<ThreatEvent> {
  const filePath = join(this.dir, `${chainId}.json`);
  let lastHash: string | null = null;

  while (true) {
    try {
      const contents = await readFile(filePath, 'utf8');
      const currentHash = createHash('sha256').update(contents).digest('hex');
      if (lastHash === null) {
        lastHash = currentHash; // baseline
      } else if (currentHash !== lastHash) {
        lastHash = currentHash;
        yield { type: 'FILE_MODIFIED', chainId, timestamp: ..., detail: filePath };
      }
    } catch (err) {
      if (isEnoent(err)) {
        yield { type: 'FILE_MISSING', chainId, timestamp: ..., detail: filePath };
        lastHash = null; // reset baseline if file comes back
      } else {
        yield { type: 'UNEXPECTED_ERROR', chainId, timestamp: ..., detail: String(err) };
      }
    }
    await sleep(this.pollIntervalMs);
  }
}
```

### Helper: isEnoent

```typescript
function isEnoent(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'ENOENT';
}
```

### sleep helper

```typescript
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Test strategy

Use real filesystem + short poll interval (100ms). Write a file, start watching, then modify/delete it and collect events with a timeout. Use `Promise.race` with a timeout to avoid hanging tests.

```typescript
async function collectEvents(
  iterable: AsyncIterable<ThreatEvent>,
  count: number,
  timeoutMs: number,
): Promise<ThreatEvent[]> {
  const events: ThreatEvent[] = [];
  const iter = iterable[Symbol.asyncIterator]();
  const deadline = Date.now() + timeoutMs;
  while (events.length < count && Date.now() < deadline) {
    const result = await Promise.race([
      iter.next(),
      new Promise<IteratorResult<ThreatEvent>>((resolve) =>
        setTimeout(() => resolve({ value: undefined, done: true }), deadline - Date.now()),
      ),
    ]);
    if (result.done) break;
    events.push(result.value);
  }
  // Clean up generator
  await iter.return?.();
  return events;
}
```

---

## Complete Implementation

### packages/fs/src/connector.ts (updated)

```typescript
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { migrateChain, verifyChain } from "@glory-chain/core";
import type {
  Chain,
  Connector,
  ISO8601,
  ThreatEvent,
  VerificationResult,
} from "@glory-chain/core";

export interface FsConnectorOptions {
  pollIntervalMs?: number;
}

function isEnoent(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "ENOENT"
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FsConnector implements Connector {
  readonly version = "0.0.1";
  private readonly pollIntervalMs: number;

  constructor(
    private readonly dir: string,
    options: FsConnectorOptions = {},
  ) {
    this.pollIntervalMs = options.pollIntervalMs ?? 2000;
  }

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
    let lastHash: string | null = null;

    while (true) {
      try {
        const contents = await readFile(filePath, "utf8");
        const currentHash = createHash("sha256").update(contents).digest("hex");
        if (lastHash === null) {
          lastHash = currentHash;
        } else if (currentHash !== lastHash) {
          lastHash = currentHash;
          yield {
            type: "FILE_MODIFIED",
            chainId,
            timestamp: new Date().toISOString() as ISO8601,
            detail: filePath,
          };
        }
      } catch (err) {
        if (isEnoent(err)) {
          yield {
            type: "FILE_MISSING",
            chainId,
            timestamp: new Date().toISOString() as ISO8601,
            detail: `Chain file not found: ${filePath}`,
          };
          lastHash = null;
        } else {
          yield {
            type: "UNEXPECTED_ERROR",
            chainId,
            timestamp: new Date().toISOString() as ISO8601,
            detail: String(err),
          };
        }
      }
      await sleep(this.pollIntervalMs);
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

### packages/fs/src/watch.test.ts

```typescript
import { randomUUID } from "node:crypto";
import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createChain, generateKeypair } from "@glory-chain/core";
import type { ThreatEvent } from "@glory-chain/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FsConnector } from "./connector.js";

const POLL_MS = 100;

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `glory-chain-watch-${randomUUID()}`);
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
  await iter.return?.();
  return events;
}

function makeChain() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain = createChain(
    { content: "genesis", purpose: "test", creatorId: "user1", identityType: "anonymous", publicKey: kp.value.publicKey },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  return chain.value;
}

describe("FsConnector.watch() — threat detection", () => {
  it("emits FILE_MISSING when file does not exist", async () => {
    const connector = new FsConnector(testDir, { pollIntervalMs: POLL_MS });
    const events = await collectEvents(connector.watch("nonexistent"), 1, 1000);
    expect(events[0]?.type).toBe("FILE_MISSING");
  });

  it("emits no events for stable file", async () => {
    const chain = makeChain();
    const connector = new FsConnector(testDir, { pollIntervalMs: POLL_MS });
    await connector.write(chain);
    // Wait 3 polls — should see no events
    const events = await collectEvents(
      connector.watch(chain.metadata.chainId),
      1,
      POLL_MS * 3 + 50,
    );
    expect(events).toEqual([]);
  });

  it("emits FILE_MISSING when file is deleted after watch starts", async () => {
    const chain = makeChain();
    const connector = new FsConnector(testDir, { pollIntervalMs: POLL_MS });
    await connector.write(chain);
    const filePath = join(testDir, `${chain.metadata.chainId}.json`);

    // Start watching, then delete file after first poll
    const watchIterable = connector.watch(chain.metadata.chainId);
    setTimeout(() => unlink(filePath).catch(() => {}), POLL_MS + 20);
    const events = await collectEvents(watchIterable, 1, 1500);
    expect(events[0]?.type).toBe("FILE_MISSING");
  });

  it("emits FILE_MODIFIED when file contents change", async () => {
    const chain = makeChain();
    const connector = new FsConnector(testDir, { pollIntervalMs: POLL_MS });
    await connector.write(chain);
    const filePath = join(testDir, `${chain.metadata.chainId}.json`);

    const watchIterable = connector.watch(chain.metadata.chainId);
    // Modify file after first poll baseline is set
    setTimeout(
      () => writeFile(filePath, '{"tampered":true}', "utf8").catch(() => {}),
      POLL_MS + 20,
    );
    const events = await collectEvents(watchIterable, 1, 1500);
    expect(events[0]?.type).toBe("FILE_MODIFIED");
  });

  it("ThreatEvent has chainId, timestamp, and detail", async () => {
    const connector = new FsConnector(testDir, { pollIntervalMs: POLL_MS });
    const events = await collectEvents(connector.watch("test-id"), 1, 1000);
    const event = events[0];
    expect(event?.chainId).toBe("test-id");
    expect(typeof event?.timestamp).toBe("string");
    expect(typeof event?.detail).toBe("string");
  });
});
```

---

## Traceability

| AC | Requirement |
|----|-------------|
| watch() never throws | FR18 |
| FILE_MISSING on deletion | FR18 |
| FILE_MODIFIED on tampering | FR18 |
| UNEXPECTED_ERROR catch-all | FR18 |
| Configurable poll interval | Testability |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### File List
- `packages/fs/src/connector.ts` (updated)
- `packages/fs/src/watch.test.ts`
