import type { Block, GenesisBlock, ISO8601 } from "./block.js";
import type { VerificationResult } from "./verification.js";

// MigrationEvent — recorded permanently when a chain moves between connectors (FR6)
// Every migration is a provenance scar — stored in ChainMetadata, never deleted
export interface MigrationEvent {
  fromConnector: string; // connector identifier, e.g. 'fs', 'github'
  toConnector: string; // connector identifier
  timestamp: ISO8601;
  reason?: string;
}

// ForkReference — recorded on the original chain when a fork is created (FR53)
export interface ForkReference {
  forkChainId: string; // chainId of the fork
  forkFromBlock: number; // block number where the fork diverges
  forkSourceBlockHash: string;
  createdAt: ISO8601;
}

// TransferEvent — reserved for Phase 3 ownership transfer (FR39)
// Present as an empty array in MVP to preserve schema stability
export interface TransferEvent {
  fromIdentity: string;
  toIdentity: string;
  timestamp: ISO8601;
  reason?: string;
}

// ChainMetadata — stored alongside blocks, not embedded in blocks
export interface ChainMetadata {
  chainId: string; // UUID v4
  createdAt: ISO8601;
  protocolVersion: string; // protocol version at chain creation
  hashAlgorithm: string; // e.g. 'sha256' — applies to all blocks in the chain
  signatureScheme: string; // e.g. 'ed25519' — applies to all blocks in the chain
  migrationHistory: MigrationEvent[]; // provenance scar — ordered list of all migrations
  knownForks: ForkReference[]; // forks created from this chain (FR53)
  transferHistory: TransferEvent[]; // reserved: always [] in MVP (FR39)
}

// ThreatEvent — emitted by Connector.watch() when the persistence environment shows anomalies
export type ThreatEventType =
  | "CHAIN_NOT_FOUND" // chain storage missing entirely
  | "BLOCK_MODIFIED" // block content changed after write
  | "REPO_MADE_PRIVATE" // GitHub connector: repo visibility changed
  | "REPO_DELETED" // GitHub connector: repo deleted
  | "FILE_MISSING" // fs connector: chain file missing
  | "FILE_MODIFIED" // fs connector: chain file modified outside protocol
  | "UNEXPECTED_ERROR"; // connector-specific unexpected failure

export interface ThreatEvent {
  type: ThreatEventType;
  chainId: string;
  timestamp: ISO8601;
  detail?: string; // connector-specific detail message
}

// Chain — the complete in-memory representation of a chain
// blocks is a tuple: genesis block always at index 0, followed by zero or more standard blocks
export interface Chain {
  metadata: ChainMetadata;
  blocks: [GenesisBlock, ...Block[]];
}

// Connector — the versioned public API contract for persistence plugins (FR20, NFR20)
// All connector packages (@glorychain/fs, @glorychain/github) implement this interface
// Breaking changes to this interface require an RFC
export interface Connector {
  version: string; // connector implementation version
  read(chainId: string): Promise<Chain>;
  write(chain: Chain): Promise<void>; // idempotent — writing same chain twice is safe
  watch(chainId: string): AsyncIterable<ThreatEvent>; // never throws — emits errors as ThreatEvent
  migrate(chainId: string, target: Connector): Promise<void>;
  verify(chainId: string): Promise<VerificationResult>;
}
