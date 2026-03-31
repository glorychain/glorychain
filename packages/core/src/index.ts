// @glorychain/core — public API surface
// All consumers import from '@glorychain/core' only — never from internal paths

// Block utilities
export type { BlockInspection } from "./block/index.js";
export {
  blockCanonical,
  computeBlockHash,
  genesisCanonical,
  inspectBlock,
  isGenesisBlock,
} from "./block/index.js";
export type {
  AppendBlockInput,
  AppendOptions,
  CreateChainInput,
  ForkChainInput,
} from "./chain/index.js";
// Chain lifecycle
export {
  appendBlock,
  createChain,
  forkChain,
  migrateChain,
  PROTOCOL_VERSION,
  recordForkOnSource,
} from "./chain/index.js";
// Crypto primitives
export {
  CUSTODY_WARNING,
  generateKeypair,
  hashBlock,
  signBlock,
  verifyBlock,
} from "./crypto/index.js";
// Feed generation
export type { FeedOptions } from "./feed/index.js";
export { generateFeed } from "./feed/index.js";
// Block types
export type {
  Block,
  ExternalAnchor,
  ForkGenesisBlock,
  GenesisBlock,
  ISO8601,
  JsonSchemaV7,
  SchemaValidationError,
} from "./schema/block.js";
// Chain types
export type {
  Chain,
  ChainMetadata,
  Connector,
  ForkReference,
  MigrationEvent,
  ThreatEvent,
  ThreatEventType,
  TransferEvent,
} from "./schema/chain.js";
export type { ErrorCodeValue, GloryChainError, Result } from "./schema/errors.js";
// Error types — ErrorCode is a value export (needed at runtime); rest are type-only
export { ErrorCode } from "./schema/errors.js";
// Verification types
export type { VerificationError, VerificationResult } from "./schema/verification.js";
export type { ContentValidationResult, ContentValidator } from "./validate/index.js";
// Schema validation — opt-in, keeps core dependency-free
export { createAjvValidator } from "./validate/index.js";
// Verification
export { verifyChain, verifySingleBlock } from "./verify/index.js";
export type { KeyResolver, VerifyOptions } from "./verify/verifyChain.js";
