# @glorychain/shared

## 0.1.0

### Minor Changes

- Add async `verifyChain` overload with `KeyResolver` support, `MISSING_KEY` error code, and genesis block schemas.

  **@glorychain/core**

  - `verifyChain` now accepts an optional `keyResolver` callback for async key lookup (key rotation, multi-key chains)
  - New `KeyResolver` type exported from the package
  - New `MISSING_KEY` (`MISSING_KEY`) `ErrorCode` returned when no key can be resolved for a block
  - `VerifyOptions` now exported as a public type

  **@glorychain/shared**

  - New `GenesisBlockContentSchema` and `GenesisFrontmatterSchema` Zod schemas
  - `GenesisBlockContent` and `GenesisFrontmatter` types exported
  - Expanded chain and suggestion validators

## 0.0.2

### Patch Changes

- eb1e610: Fix API inaccuracies across all documentation and examples.

  Notable bug fix: examples were passing `schema:` to `createChain` instead of `contentSchema:` — the wrong field was silently ignored at runtime, so schema enforcement was never applied. All examples now correctly use `contentSchema`.

  Documentation corrections: protocol version `0.0.1` (was `0.1`), correct genesis block shape, canonical payload format, fork field names, `forkChain` signature, `Connector` interface, `ChainMetadata` shape, `FsConnector` constructor, `connector.write(chain)` signature, `ThreatEventType` values, `verifySingleBlock` naming, `DecisionLog`/`DocumentRegister.supersede` parameters, and `packages/shared` exports.
