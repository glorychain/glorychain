# @glorychain/github

## 0.0.4

### Patch Changes

- Updated dependencies
  - @glorychain/core@0.2.0

## 0.0.3

### Patch Changes

- eb1e610: Fix API inaccuracies across all documentation and examples.

  Notable bug fix: examples were passing `schema:` to `createChain` instead of `contentSchema:` — the wrong field was silently ignored at runtime, so schema enforcement was never applied. All examples now correctly use `contentSchema`.

  Documentation corrections: protocol version `0.0.1` (was `0.1`), correct genesis block shape, canonical payload format, fork field names, `forkChain` signature, `Connector` interface, `ChainMetadata` shape, `FsConnector` constructor, `connector.write(chain)` signature, `ThreatEventType` values, `verifySingleBlock` naming, `DecisionLog`/`DocumentRegister.supersede` parameters, and `packages/shared` exports.

- Updated dependencies
- Updated dependencies [eb1e610]
- Updated dependencies [ae1e0db]
  - @glorychain/core@0.1.0

## 0.0.2

### Patch Changes

- Updated dependencies
  - @glorychain/core@0.0.3
