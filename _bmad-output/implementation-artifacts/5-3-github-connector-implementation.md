# Story 5.3 — GitHub Connector Implementation

**Story ID:** 5.3
**Story Key:** `5-3-github-connector-implementation`
**Epic:** 5 — Conformance CLI and GitHub Connector
**Status:** ready-for-dev
**Created:** 2026-03-22

---

## Story

As a developer using Glory Chain, I want a `GitHubConnector` in `packages/github` that implements the full `Connector` interface, so that I can persist and retrieve chains as JSON files in a GitHub repository.

---

## Background and Context

`packages/github` is a stub. This story implements:
- `GitHubConnector` — stores chains as `{chainId}.json` in a GitHub repository
- Uses the GitHub REST API via `node:https` (or `fetch` — Node 18+ built-in)
- `pages.ts` — auto-generates GitHub Pages URL for any chain (FR17)
- Zero external HTTP dependencies — uses built-in `node:https`

### GitHub API operations
- `read(chainId)` — GET file contents via `GET /repos/{owner}/{repo}/contents/{path}`
- `write(chain)` — PUT file via `PUT /repos/{owner}/{repo}/contents/{path}`
- `watch()` — placeholder for Story 5.4 (returns async generator that immediately exits)
- `migrate(chainId, target)` — delegates to `migrateChain` + `target.write`
- `verify(chainId)` — reads + verifies via `verifyChain`

### GitHubConnectorConfig
```typescript
export interface GitHubConnectorConfig {
  owner: string;      // GitHub username or org
  repo: string;       // Repository name
  token: string;      // GitHub personal access token
  branch?: string;    // Default: "main"
  dir?: string;       // Directory in repo, default: "chains"
}
```

### File path in repo
`{dir}/{chainId}.json` — e.g. `chains/abc123.json`

### HTTP implementation
Use `node:https` to avoid external dependencies. Or use `fetch` (Node 18+ global).

Story 5.4 adds the real polling watch loop + threat detection.

---

## Acceptance Criteria

### AC-1: Package updated with real scripts
`build`, `typecheck`, `lint`, `test` scripts work. `@types/node` added.

### AC-2: GitHubConnector implements Connector interface
All 5 methods + `version` property.

### AC-3: read() fetches chain from GitHub
Makes authenticated GET request, decodes base64 content, returns parsed Chain.

### AC-4: write() upserts chain to GitHub
Makes authenticated PUT request with base64-encoded content. If file exists, includes `sha` for update.

### AC-5: pages.ts generates GitHub Pages URL
`getPagesUrl(config, chainId)` returns `https://{owner}.github.io/{repo}/chains/{chainId}.json`

### AC-6: watch() returns empty AsyncIterable
Placeholder for Story 5.4. Never throws.

### AC-7: Unit tests for pages.ts
Test URL generation. No network calls.

### AC-8: Full pipeline passes

---

## Complete Implementation

### packages/github/package.json (updated)

```json
{
  "name": "@glory-chain/github",
  "version": "0.0.1",
  "type": "module",
  "description": "Glory Chain GitHub connector",
  "main": "./dist/index.mjs",
  "types": "./dist/index.d.mts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.mts"
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

### packages/github/tsconfig.json (updated)

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

### packages/github/tsdown.config.ts

```typescript
import { defineConfig } from "tsdown";
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  deps: { neverBundle: ["@glory-chain/core"] },
});
```

### packages/github/vitest.config.ts

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

### packages/github/src/pages.ts

```typescript
import type { GitHubConnectorConfig } from "./connector.js";

export function getPagesUrl(config: GitHubConnectorConfig, chainId: string): string {
  const dir = config.dir ?? "chains";
  return `https://${config.owner}.github.io/${config.repo}/${dir}/${chainId}.json`;
}
```

### packages/github/src/connector.ts

Uses `fetch` (Node 18+ global) for HTTP requests. No external deps.

```typescript
import { migrateChain, verifyChain } from "@glory-chain/core";
import type { Chain, Connector, ISO8601, ThreatEvent, VerificationResult } from "@glory-chain/core";

export interface GitHubConnectorConfig {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
  dir?: string;
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
    const data = await res.json() as { content: string };
    const decoded = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
    return JSON.parse(decoded) as Chain;
  }

  async write(chain: Chain): Promise<void> {
    const path = this.filePath(chain.metadata.chainId);
    const url = `${this.apiBase()}/${path}`;
    const content = Buffer.from(JSON.stringify(chain, null, 2), "utf8").toString("base64");
    // Check if file exists to get SHA for update
    let sha: string | undefined;
    const existing = await fetch(`${url}?ref=${this.branch}`, { headers: this.headers() });
    if (existing.ok) {
      const data = await existing.json() as { sha: string };
      sha = data.sha;
    }
    const body = {
      message: `glory-chain: upsert chain ${chain.metadata.chainId}`,
      content,
      branch: this.branch,
      ...(sha !== undefined && { sha }),
    };
    const res = await fetch(url, { method: "PUT", headers: this.headers(), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  async *watch(_chainId: string): AsyncIterable<ThreatEvent> {
    // Placeholder — full threat detection implemented in Story 5.4
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
```

### packages/github/src/index.ts

```typescript
export { GitHubConnector } from "./connector.js";
export type { GitHubConnectorConfig } from "./connector.js";
export { getPagesUrl } from "./pages.js";
```

### packages/github/src/pages.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { getPagesUrl } from "./pages.js";

describe("getPagesUrl", () => {
  it("generates correct GitHub Pages URL with default dir", () => {
    const url = getPagesUrl({ owner: "alice", repo: "my-chain", token: "tok" }, "chain-123");
    expect(url).toBe("https://alice.github.io/my-chain/chains/chain-123.json");
  });

  it("uses custom dir when specified", () => {
    const url = getPagesUrl({ owner: "alice", repo: "my-chain", token: "tok", dir: "data" }, "chain-abc");
    expect(url).toBe("https://alice.github.io/my-chain/data/chain-abc.json");
  });
});
```

---

## Traceability

| AC | Requirement |
|----|-------------|
| GitHubConnector implements Connector | FR16, FR20 |
| read/write JSON | FR16 |
| pages URL | FR17 |
| watch placeholder | FR18 (full in Story 5.4) |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### File List
- `packages/github/package.json` (updated)
- `packages/github/tsconfig.json` (updated)
- `packages/github/tsdown.config.ts`
- `packages/github/vitest.config.ts`
- `packages/github/src/connector.ts`
- `packages/github/src/pages.ts`
- `packages/github/src/index.ts`
- `packages/github/src/pages.test.ts`
