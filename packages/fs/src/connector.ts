import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Chain, Connector, ISO8601, ThreatEvent, VerificationResult } from "@glorychain/core";
import { migrateChain, verifyChain } from "@glorychain/core";

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
    let lastMtimeMs: number | null = null;

    while (true) {
      try {
        const { mtimeMs } = await stat(filePath);
        if (lastMtimeMs === null) {
          lastMtimeMs = mtimeMs;
        } else if (mtimeMs !== lastMtimeMs) {
          lastMtimeMs = mtimeMs;
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
          lastMtimeMs = null;
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
