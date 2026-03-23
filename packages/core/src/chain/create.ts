import { randomUUID } from "node:crypto";
import { hashBlock } from "../crypto/hash.js";
import { signBlock } from "../crypto/sign.js";
import type { GenesisBlock, ISO8601, JsonSchemaV7 } from "../schema/block.js";
import type { Chain, ChainMetadata } from "../schema/chain.js";
import type { GloryChainError, Result } from "../schema/errors.js";

export const PROTOCOL_VERSION = "0.0.1";

export interface CreateChainInput {
  content: string;
  purpose: string;
  creatorId: string;
  identityType: "oauth" | "external" | "anonymous";
  publicKey: string;
  hashAlgorithm?: string;
  signatureScheme?: string;
  contentSchema?: JsonSchemaV7; // optional JSON Schema v7 — all subsequent blocks must validate against this
}

export function createChain(
  input: CreateChainInput,
  privateKey: string,
): Result<Chain, GloryChainError> {
  const {
    content,
    purpose,
    creatorId,
    identityType,
    publicKey,
    hashAlgorithm = "sha256",
    signatureScheme = "ed25519",
    contentSchema,
  } = input;

  const chainId = randomUUID();
  const timestamp = new Date().toISOString() as ISO8601;
  const protocolVersion = PROTOCOL_VERSION;

  // contentSchema ?? null ensures deterministic canonical form regardless of whether
  // a schema was provided — chains with and without a schema produce stable, comparable hashes.
  const canonical = JSON.stringify({
    blockNumber: 0,
    chainId,
    content,
    timestamp,
    previousHash: null,
    protocolVersion,
    creatorId,
    purpose,
    identityType,
    hashAlgorithm,
    signatureScheme,
    contentSchema: contentSchema ?? null,
  });

  const hashResult = hashBlock(canonical, hashAlgorithm);
  if (!hashResult.ok) return hashResult;

  const signResult = signBlock(canonical, privateKey, signatureScheme);
  if (!signResult.ok) return signResult;

  const genesisBlock: GenesisBlock = {
    blockNumber: 0,
    chainId,
    content,
    timestamp,
    previousHash: null,
    hash: hashResult.value,
    signature: signResult.value,
    publicKey,
    protocolVersion,
    creatorId,
    purpose,
    identityType,
    hashAlgorithm,
    signatureScheme,
    ...(contentSchema !== undefined ? { contentSchema } : {}),
  };

  const metadata: ChainMetadata = {
    chainId,
    createdAt: timestamp,
    protocolVersion,
    hashAlgorithm,
    signatureScheme,
    migrationHistory: [],
    knownForks: [],
    transferHistory: [],
  };

  return { ok: true, value: { metadata, blocks: [genesisBlock] } };
}
