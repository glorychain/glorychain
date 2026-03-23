import type { Block, GenesisBlock } from "../schema/block.js";

export function genesisCanonical(block: GenesisBlock): string {
  return JSON.stringify({
    blockNumber: block.blockNumber,
    chainId: block.chainId,
    content: block.content,
    timestamp: block.timestamp,
    previousHash: block.previousHash,
    protocolVersion: block.protocolVersion,
    creatorId: block.creatorId,
    purpose: block.purpose,
    identityType: block.identityType,
    hashAlgorithm: block.hashAlgorithm,
    signatureScheme: block.signatureScheme,
    // contentSchema is always present in the canonical form for determinism.
    // null when absent — ensures chains with and without a schema have stable, comparable hashes.
    contentSchema: block.contentSchema ?? null,
  });
}

export function blockCanonical(block: Block): string {
  return JSON.stringify({
    blockNumber: block.blockNumber,
    chainId: block.chainId,
    content: block.content,
    timestamp: block.timestamp,
    previousHash: block.previousHash,
    protocolVersion: block.protocolVersion,
  });
}
