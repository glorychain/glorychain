---
"@glorychain/core": minor
---

Forked chains are now self-contained. `forkChain()` copies source blocks `0..forkFromBlockNumber` into the fork as provenance blocks (`provenance: true`), followed by the fork genesis at `blockNumber = forkFromBlockNumber + 1`. The fork genesis's `forkSourceBlockHash` cryptographically anchors the provenance section.

`verifyChain()` handles the three zones: provenance blocks (hash/sig verified, chainId mismatch skipped by design), the fork genesis boundary (`forkSourceBlockHash` verified against the last provenance block), and post-fork blocks (normal verification).

`ForkGenesisBlock.blockNumber` is now `number` (was `0` via inheritance from `GenesisBlock`). `genesisCanonical()` now accepts both `GenesisBlock` and `ForkGenesisBlock`.
