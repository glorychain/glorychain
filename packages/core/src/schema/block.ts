// ISO 8601 branded string — prevents accidental assignment of arbitrary strings to timestamp fields
export type ISO8601 = string & { readonly __iso8601: unique symbol };

// ExternalAnchor — reserved in genesis schema for Phase 3 (FR59)
// Field is stored and surfaced by `glorychain inspect` but NOT verified until Phase 3
export interface ExternalAnchor {
  chainType: string; // e.g. 'bitcoin', 'ethereum'
  blockHash: string; // block hash on the external chain
  blockHeight: number; // block height on the external chain
  networkId: string; // e.g. 'mainnet', 'testnet'
}

// Block — a standard (non-genesis) block in a chain
export interface Block {
  blockNumber: number; // 1-based for non-genesis blocks (genesis is 0)
  chainId: string; // UUID v4 — included in signature for replay attack prevention (FR12)
  content: string; // arbitrary UTF-8 content payload
  timestamp: ISO8601; // ISO 8601 — when this block was created
  previousHash: string; // lowercase hex SHA-256 of the preceding block
  hash: string; // lowercase hex SHA-256 of this block's canonical payload
  signature: string; // base64url-encoded signature over: chainId + blockNumber + content + previousHash
  publicKey: string; // base64url-encoded public key that signed this block
  protocolVersion: string; // protocol version at time of block creation (FR14)
  provenance?: true; // present on blocks copied from source chain during fork — read-only historical record
}

// JsonSchemaV7 — a plain JSON-serialisable JSON Schema v7 definition.
// Stored in the genesis block's contentSchema field.
// Included in the genesis canonical payload — cryptographically bound, cannot change post-creation.
export type JsonSchemaV7 = Record<string, unknown>;

// SchemaValidationError — a single validation failure from contentSchema validation.
export interface SchemaValidationError {
  path: string; // JSON pointer to the failing field, e.g. "/vote"
  message: string; // human-readable description of the failure
}

// GenesisBlock — the first block (blockNumber: 0) in any chain
// Extends Block but:
//   - blockNumber is the literal type 0 (discriminant for narrowing)
//   - previousHash is null (no preceding block)
//   - adds genesis-specific fields
export interface GenesisBlock extends Omit<Block, "blockNumber" | "previousHash"> {
  blockNumber: 0; // literal type — discriminates GenesisBlock from Block
  previousHash: null; // genesis has no previous block
  creatorId: string; // declared identity — optional validation by caller; not verified by platform
  purpose: string; // the chain's declared purpose (genesis statement)
  identityType: "oauth" | "external" | "anonymous";
  hashAlgorithm: string; // hash algorithm used for this chain (default: 'sha256')
  signatureScheme: string; // signature scheme used (default: 'ed25519')
  contentSchema?: JsonSchemaV7; // optional JSON Schema v7 — all non-genesis block content must validate against this
  externalAnchor?: ExternalAnchor; // reserved — FR59; schema-only in MVP 1
}

// ForkGenesisBlock — genesis block for a forked chain
// Carries provenance reference to the original chain and fork point.
// blockNumber is overridden to number — fork genesis sits at forkFromBlock + 1, not 0.
export interface ForkGenesisBlock extends Omit<GenesisBlock, "blockNumber"> {
  blockNumber: number; // position in fork chain = forkFromBlock + 1
  forkOf: string; // chainId of the original chain this was forked from
  forkFromBlock: number; // block number on the original chain at which fork diverges
  forkSourceBlockHash: string; // hash of the source block (content-addressable reference — not just the number)
  forkReason?: string; // optional human-readable reason, e.g. 'maintainer key compromised'
}
