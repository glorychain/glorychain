---
"@glorychain/structures": major
---

**Breaking:** `OrgTree.reportsTo` changed from `string | null` to `number | null`.

`reportsTo` now holds the block number of the manager's APPOINT event rather than a user-defined ID string. Block numbers are immutable and protocol-guaranteed unique; member IDs are user-defined and uniqueness is only enforced by convention.

**Migration:** Update all `OrgTree.appoint()`, `OrgTree.promote()`, and `OrgTree.transfer()` calls to pass the manager's `appointedAtBlock` value instead of their ID string.
