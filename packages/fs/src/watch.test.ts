import { randomUUID } from "node:crypto";
import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ThreatEvent } from "@glorychain/core";
import { createChain, generateKeypair } from "@glorychain/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FsConnector } from "./connector.js";

const POLL_MS = 100;

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `glorychain-watch-${randomUUID()}`);
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
      content: "genesis",
      purpose: "test",
      creatorId: "user1",
      identityType: "anonymous",
      publicKey: kp.value.publicKey,
    },
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
