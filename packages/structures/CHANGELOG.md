# @glorychain/structures

## 1.0.1

### Patch Changes

- Updated dependencies
  - @glorychain/core@0.2.0

## 1.0.0

### Major Changes

- ae1e0db: **Breaking:** `OrgTree.reportsTo` changed from `string | null` to `number | null`.

  `reportsTo` now holds the block number of the manager's APPOINT event rather than a user-defined ID string. Block numbers are immutable and protocol-guaranteed unique; member IDs are user-defined and uniqueness is only enforced by convention.

  **Migration:** Update all `OrgTree.appoint()`, `OrgTree.promote()`, and `OrgTree.transfer()` calls to pass the manager's `appointedAtBlock` value instead of their ID string.

### Minor Changes

- All structure event type aliases converted to enums.

  `AccessEventType`, `ChangeLogEventType`, `DecisionEventType`, `DocumentEventType`, `KeyValueEventType`, `MemberEventType`, `OrgEventType`, `TimelineEventType`, and `VoteEventType` are now `enum` values instead of string union types.

  **Migration:** Replace string literals with enum members where TypeScript requires it (e.g. `type: "GRANT"` → `type: AccessEventType.GRANT`). At runtime the values are identical — no serialisation changes.

### Patch Changes

- eb1e610: Fix API inaccuracies across all documentation and examples.

  Notable bug fix: examples were passing `schema:` to `createChain` instead of `contentSchema:` — the wrong field was silently ignored at runtime, so schema enforcement was never applied. All examples now correctly use `contentSchema`.

  Documentation corrections: protocol version `0.0.1` (was `0.1`), correct genesis block shape, canonical payload format, fork field names, `forkChain` signature, `Connector` interface, `ChainMetadata` shape, `FsConnector` constructor, `connector.write(chain)` signature, `ThreatEventType` values, `verifySingleBlock` naming, `DecisionLog`/`DocumentRegister.supersede` parameters, and `packages/shared` exports.

- Updated dependencies
- Updated dependencies [eb1e610]
- Updated dependencies [ae1e0db]
  - @glorychain/core@0.1.0

## 0.1.1

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

## 0.1.0

### Minor Changes

- Add six new stateful structures: VoteRegister, DecisionLog, Timeline, DocumentRegister, AccessList, and ChangeLog.

  - **VoteRegister** — motion and vote ledger with per-voter tracking, tallies, and outcome derivation. Good for board meetings, governance votes, committee decisions.
  - **DecisionLog** — structured ADR/resolution register with supersession lineage. Superseded decisions remain permanently in the chain.
  - **Timeline** — ordered, tagged entry log. Good for voting records, policy commitments, press release histories.
  - **DocumentRegister** — versioned document registry with content hashes for tamper-evidence. Tracks publish, supersede, withdraw, restore lifecycle.
  - **AccessList** — auditable grant/revoke log with expiry detection via `stale()`. Good for approved vendor lists, API key registers, allowlists.
  - **ChangeLog** — software release log with release, deprecate, and yank events. Deprecations and yanks are permanent and attributable.

## 0.0.2

### Patch Changes

- structures
