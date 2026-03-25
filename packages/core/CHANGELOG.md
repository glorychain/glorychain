# @glorychain/core

## 0.0.3

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
