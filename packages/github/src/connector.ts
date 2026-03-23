import type { Chain, Connector, ISO8601, ThreatEvent, VerificationResult } from "@glorychain/core";
import { migrateChain, verifyChain } from "@glorychain/core";

export interface GitHubConnectorConfig {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
  dir?: string;
  pollIntervalMs?: number;
}

export class GitHubConnector implements Connector {
  readonly version = "0.0.1";
  private readonly branch: string;
  private readonly dir: string;

  constructor(private readonly config: GitHubConnectorConfig) {
    this.branch = config.branch ?? "main";
    this.dir = config.dir ?? "chains";
  }

  private filePath(chainId: string): string {
    return `${this.dir}/${chainId}.json`;
  }

  private apiBase(): string {
    return `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents`;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  async read(chainId: string): Promise<Chain> {
    const url = `${this.apiBase()}/${this.filePath(chainId)}?ref=${this.branch}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    const data = (await res.json()) as { content: string };
    const decoded = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
    return JSON.parse(decoded) as Chain;
  }

  async write(chain: Chain): Promise<void> {
    const path = this.filePath(chain.metadata.chainId);
    const url = `${this.apiBase()}/${path}`;
    const content = Buffer.from(JSON.stringify(chain, null, 2), "utf8").toString("base64");
    let sha: string | undefined;
    const existing = await fetch(`${url}?ref=${this.branch}`, { headers: this.headers() });
    if (existing.ok) {
      const data = (await existing.json()) as { sha: string };
      sha = data.sha;
    }
    const body = {
      message: `glorychain: upsert chain ${chain.metadata.chainId}`,
      content,
      branch: this.branch,
      ...(sha !== undefined && { sha }),
    };
    const res = await fetch(url, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  async *watch(chainId: string): AsyncIterable<ThreatEvent> {
    const filePath = this.filePath(chainId);
    const url = `${this.apiBase()}/${filePath}?ref=${this.branch}`;
    let lastHash: string | null = null;
    const pollMs = this.config.pollIntervalMs ?? 30_000;

    while (true) {
      try {
        const res = await fetch(url, { headers: this.headers() });
        if (res.status === 404) {
          yield {
            type: "FILE_MISSING",
            chainId,
            timestamp: new Date().toISOString() as ISO8601,
            detail: filePath,
          };
          lastHash = null;
        } else if (!res.ok) {
          yield {
            type: "UNEXPECTED_ERROR",
            chainId,
            timestamp: new Date().toISOString() as ISO8601,
            detail: `HTTP ${res.status}`,
          };
        } else {
          const data = (await res.json()) as { content: string; sha: string };
          const currentHash = data.sha;
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
        }
      } catch (err) {
        yield {
          type: "UNEXPECTED_ERROR",
          chainId,
          timestamp: new Date().toISOString() as ISO8601,
          detail: String(err),
        };
      }
      await new Promise<void>((resolve) => setTimeout(resolve, pollMs));
    }
  }

  async migrate(chainId: string, target: Connector): Promise<void> {
    const chain = await this.read(chainId);
    const updated = migrateChain(chain, "github", target.version);
    await target.write(updated);
  }

  async verify(chainId: string): Promise<VerificationResult> {
    const chain = await this.read(chainId);
    return verifyChain(chain);
  }
}
