# Story 5.4 — GitHub Connector Threat Detection and Integration Tests

**Story ID:** 5.4
**Story Key:** `5-4-github-connector-threat-detection-and-integration-tests`
**Epic:** 5 — Conformance CLI and GitHub Connector
**Status:** ready-for-dev
**Created:** 2026-03-22

---

## Story

As a developer using Glory Chain, I want `GitHubConnector.watch()` to continuously poll a chain file in GitHub and emit `ThreatEvent` values when the file goes missing or is externally modified, so that consumers can detect tampering in real time.

---

## Background and Context

Story 5.3 left `watch()` as a placeholder. This story upgrades it to a polling loop:
1. Checks file existence via GitHub API — emits `FILE_MISSING` if 404
2. Hashes file contents on each poll — emits `FILE_MODIFIED` if hash changes
3. Polls every N seconds (configurable via `GitHubConnectorConfig.pollIntervalMs`)
4. Never throws — all errors become `UNEXPECTED_ERROR` ThreatEvent

Integration tests require `GITHUB_TOKEN` and `GITHUB_TEST_REPO` env vars. If not set, tests skip.

---

## Acceptance Criteria

### AC-1: GitHubConnectorConfig accepts pollIntervalMs
`new GitHubConnector({ ..., pollIntervalMs: 500 })`

### AC-2: watch() polls continuously
After each check, waits pollIntervalMs then checks again.

### AC-3: FILE_MISSING emitted when file 404s
### AC-4: FILE_MODIFIED emitted when content hash changes
### AC-5: UNEXPECTED_ERROR for unexpected failures
### AC-6: Integration tests skip without credentials
### AC-7: Full pipeline passes

---

## Complete Implementation

### packages/github/src/connector.ts (updated)

Add `pollIntervalMs` to config and upgrade `watch()`:

```typescript
export interface GitHubConnectorConfig {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
  dir?: string;
  pollIntervalMs?: number;
}
```

watch() polling loop:
```typescript
async *watch(chainId: string): AsyncIterable<ThreatEvent> {
  const filePath = this.filePath(chainId);
  const url = `${this.apiBase()}/${filePath}?ref=${this.branch}`;
  let lastHash: string | null = null;
  const pollMs = this.config.pollIntervalMs ?? 30_000;

  while (true) {
    try {
      const res = await fetch(url, { headers: this.headers() });
      if (res.status === 404) {
        yield { type: "FILE_MISSING", chainId, timestamp: ..., detail: filePath };
        lastHash = null;
      } else if (!res.ok) {
        yield { type: "UNEXPECTED_ERROR", chainId, timestamp: ..., detail: `HTTP ${res.status}` };
      } else {
        const data = await res.json() as { content: string; sha: string };
        const currentHash = data.sha; // GitHub provides SHA
        if (lastHash === null) {
          lastHash = currentHash;
        } else if (currentHash !== lastHash) {
          lastHash = currentHash;
          yield { type: "FILE_MODIFIED", chainId, timestamp: ..., detail: filePath };
        }
      }
    } catch (err) {
      yield { type: "UNEXPECTED_ERROR", chainId, timestamp: ..., detail: String(err) };
    }
    await sleep(pollMs);
  }
}
```

### packages/github/src/connector.integration.test.ts

```typescript
import { describe, it, expect } from "vitest";
// Skip if no credentials
const token = process.env.GITHUB_TOKEN;
const testRepo = process.env.GITHUB_TEST_REPO; // format: "owner/repo"

describe.skipIf(!token || !testRepo)("GitHubConnector integration", () => {
  // real tests here
});
```

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### File List
- `packages/github/src/connector.ts` (updated)
- `packages/github/src/connector.integration.test.ts`
