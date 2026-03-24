# @glorychain/structures

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
