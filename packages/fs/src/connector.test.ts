import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendBlock, createChain, generateKeypair } from "@glorychain/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FsConnector } from "./connector.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `glorychain-test-${randomUUID()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

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
    const connector = new FsConnector(testDir, { pollIntervalMs: 100 });
    const iter = connector.watch("nonexistent-chain-id")[Symbol.asyncIterator]();
    const result = await iter.next();
    iter.return?.();
    expect(result.done).toBe(false);
    expect(result.value?.type).toBe("FILE_MISSING");
  });

  it("watch emits nothing for stable file within timeout", async () => {
    const { chain } = makeChain();
    const connector = new FsConnector(testDir, { pollIntervalMs: 100 });
    await connector.write(chain);
    const iter = connector.watch(chain.metadata.chainId)[Symbol.asyncIterator]();
    const result = await Promise.race([
      iter.next(),
      new Promise<IteratorResult<never, undefined>>((resolve) =>
        setTimeout(() => resolve({ value: undefined, done: true }), 350),
      ),
    ]);
    iter.return?.();
    expect(result.done).toBe(true);
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
