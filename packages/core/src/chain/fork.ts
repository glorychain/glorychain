import { randomUUID } from "node:crypto";
import { hashBlock } from "../crypto/hash.js";
import { signBlock } from "../crypto/sign.js";
import type { ForkGenesisBlock, ISO8601 } from "../schema/block.js";
import type { Chain, ChainMetadata, ForkReference } from "../schema/chain.js";
import type { GloryChainError, Result } from "../schema/errors.js";
import { ErrorCode } from "../schema/errors.js";
import { PROTOCOL_VERSION } from "./create.js";

export interface ForkChainInput {
  content: string;
  purpose: string;
  creatorId: string;
  identityType: "oauth" | "external" | "anonymous";
  publicKey: string;
  hashAlgorithm?: string;
  signatureScheme?: string;
  forkReason?: string;
}

export function forkChain(
  sourceChain: Chain,
  forkFromBlockNumber: number,
  input: ForkChainInput,
  privateKey: string,
): Result<Chain, GloryChainError> {
  const sourceBlock = sourceChain.blocks[forkFromBlockNumber];
  if (sourceBlock === undefined) {
    return {
      ok: false,
      error: {
        code: ErrorCode.CHAIN_NOT_FOUND,
        message: `Block ${forkFromBlockNumber} not found in source chain`,
        blockNumber: forkFromBlockNumber,
      },
    };
  }

  const {
    content,
    purpose,
    creatorId,
    identityType,
    publicKey,
    hashAlgorithm = sourceChain.metadata.hashAlgorithm,
    signatureScheme = sourceChain.metadata.signatureScheme,
    forkReason,
  } = input;

  const chainId = randomUUID();
  const timestamp = new Date().toISOString() as ISO8601;
  const protocolVersion = PROTOCOL_VERSION;
  const forkSourceBlockHash = sourceBlock.hash;

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
  });

  const hashResult = hashBlock(canonical, hashAlgorithm);
  if (!hashResult.ok) return hashResult;

  const signResult = signBlock(canonical, privateKey, signatureScheme);
  if (!signResult.ok) return signResult;

  const forkGenesisBlock: ForkGenesisBlock = {
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
    forkOf: sourceChain.metadata.chainId,
    forkFromBlock: forkFromBlockNumber,
    forkSourceBlockHash,
    ...(forkReason !== undefined && { forkReason }),
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

  return { ok: true, value: { metadata, blocks: [forkGenesisBlock] } };
}

export function recordForkOnSource(
  sourceChain: Chain,
  forkChainId: string,
  forkFromBlock: number,
  forkSourceBlockHash: string,
): Chain {
  const ref: ForkReference = {
    forkChainId,
    forkFromBlock,
    forkSourceBlockHash,
    createdAt: new Date().toISOString() as ISO8601,
  };
  return {
    ...sourceChain,
    metadata: {
      ...sourceChain.metadata,
      knownForks: [...sourceChain.metadata.knownForks, ref],
    },
  };
}
