//#region src/schema/block.d.ts
type ISO8601 = string & {
  readonly __iso8601: unique symbol;
};
interface ExternalAnchor {
  chainType: string;
  blockHash: string;
  blockHeight: number;
  networkId: string;
}
interface Block {
  blockNumber: number;
  chainId: string;
  content: string;
  timestamp: ISO8601;
  previousHash: string;
  hash: string;
  signature: string;
  publicKey: string;
  protocolVersion: string;
}
type JsonSchemaV7 = Record<string, unknown>;
interface SchemaValidationError {
  path: string;
  message: string;
}
interface GenesisBlock extends Omit<Block, "blockNumber" | "previousHash"> {
  blockNumber: 0;
  previousHash: null;
  creatorId: string;
  purpose: string;
  identityType: "oauth" | "external" | "anonymous";
  hashAlgorithm: string;
  signatureScheme: string;
  contentSchema?: JsonSchemaV7;
  externalAnchor?: ExternalAnchor;
}
interface ForkGenesisBlock extends GenesisBlock {
  forkOf: string;
  forkFromBlock: number;
  forkSourceBlockHash: string;
  forkReason?: string;
}
//#endregion
//#region src/block/canonical.d.ts
declare function genesisCanonical(block: GenesisBlock): string;
declare function blockCanonical(block: Block): string;
//#endregion
//#region src/schema/errors.d.ts
declare const ErrorCode: {
  readonly INVALID_SIGNATURE: "INVALID_SIGNATURE";
  readonly BROKEN_CHAIN: "BROKEN_CHAIN";
  readonly REPLAY_DETECTED: "REPLAY_DETECTED";
  readonly ALGORITHM_UNSUPPORTED: "ALGORITHM_UNSUPPORTED";
  readonly CHAIN_NOT_FOUND: "CHAIN_NOT_FOUND";
  readonly KEY_MISMATCH: "KEY_MISMATCH";
  readonly FUTURE_TIMESTAMP: "FUTURE_TIMESTAMP";
  readonly DUPLICATE_BLOCK: "DUPLICATE_BLOCK";
  readonly SCHEMA_VIOLATION: "SCHEMA_VIOLATION";
};
type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
interface GloryChainError {
  code: ErrorCodeValue;
  message: string;
  blockNumber?: number;
  schemaErrors?: SchemaValidationError[];
}
type Result<T, E = GloryChainError> = {
  readonly ok: true;
  readonly value: T;
} | {
  readonly ok: false;
  readonly error: E;
};
//#endregion
//#region src/block/inspect.d.ts
type BlockInspection = {
  type: "genesis";
  block: GenesisBlock;
} | {
  type: "block";
  block: Block;
};
declare function isGenesisBlock(block: Block | GenesisBlock): block is GenesisBlock;
declare function inspectBlock(block: Block | GenesisBlock): BlockInspection;
declare function computeBlockHash(block: Block | GenesisBlock, algorithm: string): Result<string, GloryChainError>;
//#endregion
//#region src/schema/verification.d.ts
interface VerificationError {
  code: ErrorCodeValue;
  blockNumber: number;
  message: string;
  schemaErrors?: SchemaValidationError[];
}
interface VerificationResult {
  valid: boolean;
  errors: VerificationError[];
  blockCount: number;
  lastVerifiedBlock: number;
}
//#endregion
//#region src/schema/chain.d.ts
interface MigrationEvent {
  fromConnector: string;
  toConnector: string;
  timestamp: ISO8601;
  reason?: string;
}
interface ForkReference {
  forkChainId: string;
  forkFromBlock: number;
  forkSourceBlockHash: string;
  createdAt: ISO8601;
}
interface TransferEvent {
  fromIdentity: string;
  toIdentity: string;
  timestamp: ISO8601;
  reason?: string;
}
interface ChainMetadata {
  chainId: string;
  createdAt: ISO8601;
  protocolVersion: string;
  hashAlgorithm: string;
  signatureScheme: string;
  migrationHistory: MigrationEvent[];
  knownForks: ForkReference[];
  transferHistory: TransferEvent[];
}
type ThreatEventType = "CHAIN_NOT_FOUND" | "BLOCK_MODIFIED" | "REPO_MADE_PRIVATE" | "REPO_DELETED" | "FILE_MISSING" | "FILE_MODIFIED" | "UNEXPECTED_ERROR";
interface ThreatEvent {
  type: ThreatEventType;
  chainId: string;
  timestamp: ISO8601;
  detail?: string;
}
interface Chain {
  metadata: ChainMetadata;
  blocks: [GenesisBlock, ...Block[]];
}
interface Connector {
  version: string;
  read(chainId: string): Promise<Chain>;
  write(chain: Chain): Promise<void>;
  watch(chainId: string): AsyncIterable<ThreatEvent>;
  migrate(chainId: string, target: Connector): Promise<void>;
  verify(chainId: string): Promise<VerificationResult>;
}
//#endregion
//#region src/validate/types.d.ts
type ContentValidationResult = {
  valid: true;
} | {
  valid: false;
  errors: SchemaValidationError[];
};
type ContentValidator = (content: string, schema: JsonSchemaV7) => ContentValidationResult;
//#endregion
//#region src/chain/append.d.ts
interface AppendBlockInput {
  content: string;
  publicKey: string;
}
interface AppendOptions {
  /** Optional content validator — used when the chain's genesis block defines a contentSchema.
   *  If omitted, schema validation is skipped even if contentSchema is present.
   *  Existing callers that omit this option are completely unaffected.
   *  Use createAjvValidator() from @glorychain/core for the reference implementation. */
  validateContent?: ContentValidator;
}
declare function appendBlock(chain: Chain, input: AppendBlockInput, privateKey: string, options?: AppendOptions): Result<Chain, GloryChainError>;
//#endregion
//#region src/chain/create.d.ts
declare const PROTOCOL_VERSION = "0.0.1";
interface CreateChainInput {
  content: string;
  purpose: string;
  creatorId: string;
  identityType: "oauth" | "external" | "anonymous";
  publicKey: string;
  hashAlgorithm?: string;
  signatureScheme?: string;
  contentSchema?: JsonSchemaV7;
}
declare function createChain(input: CreateChainInput, privateKey: string): Result<Chain, GloryChainError>;
//#endregion
//#region src/chain/fork.d.ts
interface ForkChainInput {
  content: string;
  purpose: string;
  creatorId: string;
  identityType: "oauth" | "external" | "anonymous";
  publicKey: string;
  hashAlgorithm?: string;
  signatureScheme?: string;
  forkReason?: string;
}
declare function forkChain(sourceChain: Chain, forkFromBlockNumber: number, input: ForkChainInput, privateKey: string): Result<Chain, GloryChainError>;
declare function recordForkOnSource(sourceChain: Chain, forkChainId: string, forkFromBlock: number, forkSourceBlockHash: string): Chain;
//#endregion
//#region src/chain/migrate.d.ts
declare function migrateChain(chain: Chain, fromConnector: string, toConnector: string, reason?: string): Chain;
//#endregion
//#region src/crypto/hash.d.ts
declare function hashBlock(payload: string, algorithm?: string): Result<string, GloryChainError>;
//#endregion
//#region src/crypto/keygen.d.ts
declare const CUSTODY_WARNING = "WARNING: Private key material is about to be displayed.\nStore this key securely \u2014 it cannot be recovered if lost.\nAnyone with access to this key can forge blocks on your chain.\nDo NOT share, commit to version control, or paste into a chat.";
declare function generateKeypair(scheme?: string): Result<{
  publicKey: string;
  privateKey: string;
}, GloryChainError>;
//#endregion
//#region src/crypto/sign.d.ts
declare function signBlock(payload: string, privateKeyBase64url: string, scheme?: string): Result<string, GloryChainError>;
declare function verifyBlock(payload: string, signatureBase64url: string, publicKeyBase64url: string, scheme?: string): Result<boolean, GloryChainError>;
//#endregion
//#region src/feed/generateFeed.d.ts
interface FeedOptions {
  selfUrl?: string;
}
declare function generateFeed(chain: Chain, options?: FeedOptions): string;
//#endregion
//#region src/validate/ajv.d.ts
declare function createAjvValidator(): ContentValidator;
//#endregion
//#region src/verify/verifyBlock.d.ts
declare function verifySingleBlock(block: Block | GenesisBlock, hashAlgorithm: string, signatureScheme: string): VerificationResult;
//#endregion
//#region src/verify/verifyChain.d.ts
interface VerifyOptions {
  /** Optional content validator — used when chain genesis defines a contentSchema.
   *  If omitted, schema validation is skipped even if contentSchema is present.
   *  Use createAjvValidator() from @glorychain/core for the reference implementation. */
  validateContent?: ContentValidator;
}
declare function verifyChain(chain: Chain, options?: VerifyOptions): VerificationResult;
//#endregion
export { type AppendBlockInput, type AppendOptions, type Block, type BlockInspection, CUSTODY_WARNING, type Chain, type ChainMetadata, type Connector, type ContentValidationResult, type ContentValidator, type CreateChainInput, ErrorCode, type ErrorCodeValue, type ExternalAnchor, type FeedOptions, type ForkChainInput, type ForkGenesisBlock, type ForkReference, type GenesisBlock, type GloryChainError, type ISO8601, type JsonSchemaV7, type MigrationEvent, PROTOCOL_VERSION, type Result, type SchemaValidationError, type ThreatEvent, type ThreatEventType, type TransferEvent, type VerificationError, type VerificationResult, type VerifyOptions, appendBlock, blockCanonical, computeBlockHash, createAjvValidator, createChain, forkChain, generateFeed, generateKeypair, genesisCanonical, hashBlock, inspectBlock, isGenesisBlock, migrateChain, recordForkOnSource, signBlock, verifyBlock, verifyChain, verifySingleBlock };
//# sourceMappingURL=index.d.mts.map