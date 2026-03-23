import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readConfig, writeConfig } from "./config.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `glorychain-config-${randomUUID()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("config utilities", () => {
  it("readConfig returns null when no config exists", async () => {
    const config = await readConfig(testDir);
    expect(config).toBeNull();
  });

  it("writeConfig + readConfig round-trip", async () => {
    const cfg = { connector: "fs", chainIds: ["chain-1", "chain-2"] };
    await writeConfig(cfg, testDir);
    const read = await readConfig(testDir);
    expect(read).toEqual(cfg);
  });

  it("writeConfig is idempotent", async () => {
    const cfg = { connector: "fs", chainIds: ["chain-1"] };
    await writeConfig(cfg, testDir);
    await writeConfig(cfg, testDir);
    const read = await readConfig(testDir);
    expect(read).toEqual(cfg);
  });
});
