import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ThreatEvent } from "@glorychain/core";
import { createChain, generateKeypair } from "@glorychain/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FsConnector } from "../../src/connector.js";

const POLL_MS = 100;

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `glorychain-integration-${randomUUID()}`);
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
    expect(migrated.metadata.migrationHistory[0]?.toConnector).toBe("0.0.1");
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
