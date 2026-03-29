import { randomUUID } from "node:crypto";
import { genesisCanonical } from "../block/canonical.js";
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
  // Fork genesis sits immediately after the last provenance block
  const forkGenesisBlockNumber = forkFromBlockNumber + 1;

  // Build an unsigned fork genesis first so genesisCanonical can include all fields correctly.
  // blockNumber is the actual position in the fork chain (not 0) — verifier uses forkOf to detect it.
  const unsignedForkGenesis: ForkGenesisBlock = {
    blockNumber: forkGenesisBlockNumber,
    chainId,
    content,
    timestamp,
    previousHash: null,
    hash: "", // placeholder — filled below
    signature: "", // placeholder — filled below
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

  const canonical = genesisCanonical(unsignedForkGenesis);

  const hashResult = hashBlock(canonical, hashAlgorithm);
  if (!hashResult.ok) return hashResult;

  const signResult = signBlock(canonical, privateKey, signatureScheme);
  if (!signResult.ok) return signResult;

  const forkGenesisBlock: ForkGenesisBlock = {
    ...unsignedForkGenesis,
    hash: hashResult.value,
    signature: signResult.value,
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

  // Copy source blocks 0..forkFromBlockNumber as provenance (read-only historical record).
  // These blocks retain their original chainId, hashes, and signatures — immutable snapshots.
  const provenanceBlocks = sourceChain.blocks
    .slice(0, forkFromBlockNumber + 1)
    .map((b) => ({ ...b, provenance: true as const }));

  const allBlocks = [...provenanceBlocks, forkGenesisBlock];

  return {
    ok: true,
    value: {
      metadata,
      // allBlocks[0] is the source genesis (GenesisBlock) — satisfies Chain's tuple constraint
      blocks: allBlocks as unknown as Chain["blocks"],
    },
  };
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
