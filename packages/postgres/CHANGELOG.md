# @glorychain/postgres

## 0.1.1

### Patch Changes

- eb1e610: Fix API inaccuracies across all documentation and examples.

  Notable bug fix: examples were passing `schema:` to `createChain` instead of `contentSchema:` — the wrong field was silently ignored at runtime, so schema enforcement was never applied. All examples now correctly use `contentSchema`.

  Documentation corrections: protocol version `0.0.1` (was `0.1`), correct genesis block shape, canonical payload format, fork field names, `forkChain` signature, `Connector` interface, `ChainMetadata` shape, `FsConnector` constructor, `connector.write(chain)` signature, `ThreatEventType` values, `verifySingleBlock` naming, `DecisionLog`/`DocumentRegister.supersede` parameters, and `packages/shared` exports.

- Updated dependencies [eb1e610]
- Updated dependencies [ae1e0db]
  - @glorychain/core@0.1.0

## 0.1.0

### Minor Changes

- New packages: `@glorychain/s3` and `@glorychain/postgres`.

  **@glorychain/s3** — S3-compatible connector. Works with AWS S3, Cloudflare R2, and MinIO. Supports custom endpoint, credentials, and key prefix.

  **@glorychain/postgres** — Postgres connector. Accepts an existing `pg.Pool` for zero-overhead embedding. Supports JSONB schema (single table) and normalised schema (blocks table). Batch INSERT for efficient writes.

### Patch Changes

- Performance improvements across core, structures, fs, postgres, and s3.

  **@glorychain/core**

  - `generateFeed`: eliminate full array copy+reverse — iterate blocks backwards directly

  **@glorychain/structures**

  - `OrgTree`: add `reportIndex` reverse index — `directReports()` is now O(k) not O(n); DEPART handover is O(k) not O(n)
  - `OrgTree.subtree()`: replace `array.shift()` with pointer traversal — O(n) not O(n²)
  - `OrgTree.atDepth()`: replace per-member `pathTo()` with single BFS — O(n) not O(n × depth)
  - `VoteRegister`: replace vote arrays with `Set<string>` — CAST dedup is O(1) not O(m)
  - `DocumentRegister`: add `hashIndex` — `byHash()` is now O(1) not O(n)
  - `Timeline`: accumulate `activeTags` map during replay — `tags` getter is O(t) not O(n×t) per call

  **@glorychain/fs**

  - `watch()`: use `stat()` mtime instead of reading and SHA-256 hashing the entire file on every poll

  **@glorychain/postgres**

  - `write()` normalised schema: batch INSERT all blocks in one round trip instead of N sequential queries

- Updated dependencies
  - @glorychain/core@0.0.3
