import { blockCanonical, genesisCanonical, isGenesisBlock } from "../block/index.js";
import { hashBlock } from "../crypto/hash.js";
import { verifyBlock as cryptoVerify } from "../crypto/sign.js";
import type { Block, GenesisBlock } from "../schema/block.js";
import type { Chain } from "../schema/chain.js";
import { ErrorCode } from "../schema/errors.js";
import type { VerificationError, VerificationResult } from "../schema/verification.js";
import type { ContentValidator } from "../validate/types.js";

const FUTURE_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Resolves the public key (base64url SPKI DER) to use for verifying a given block.
 * Supports key rotation — return a different key for each block range as needed.
 *
 * @param blockIndex - The index of the block in the chain's blocks array.
 * @param signerHint - The `publicKey` field from the block, if a hint is useful.
 * @returns base64url-encoded SPKI DER public key string.
 */
export type KeyResolver = (
  blockIndex: number,
  signerHint?: string,
) => string | Promise<string>;

export interface VerifyOptions {
  /** Optional content validator — used when chain genesis defines a contentSchema.
   *  If omitted, schema validation is skipped even if contentSchema is present.
   *  Use createAjvValidator() from @glorychain/core for the reference implementation. */
  validateContent?: ContentValidator;
  /**
   * Optional public key override (base64url SPKI DER). When supplied and no
   * `keyResolver` is provided, this key is used for all blocks instead of
   * each block's own `publicKey` field.
   */
  publicKey?: string;
  /**
   * Optional async key resolver for key-rotation scenarios. When provided,
   * `verifyChain` returns a Promise and awaits the resolver for every block.
   * Takes precedence over `publicKey`.
   */
  keyResolver?: KeyResolver;
}

// isForkGenesisBlock — detects a fork genesis block by presence of forkOf field.
// Fork genesis blocks are NOT at blockNumber 0 (provenance blocks occupy 0..N),
// so isGenesisBlock() cannot be used as the discriminant here.
function isForkGenesisBlock(block: Block | GenesisBlock): block is GenesisBlock & {
  forkOf: string;
  forkFromBlock: number;
  forkSourceBlockHash: string;
} {
  return "forkOf" in block;
}

// Sync overload — backwards compatible, no keyResolver
export function verifyChain(chain: Chain, options?: Omit<VerifyOptions, "keyResolver">): VerificationResult;
// Async overload — used when keyResolver is provided
export function verifyChain(
  chain: Chain,
  options: VerifyOptions & { keyResolver: KeyResolver },
): Promise<VerificationResult>;
// Implementation signature
export function verifyChain(
  chain: Chain,
  options?: VerifyOptions,
): VerificationResult | Promise<VerificationResult> {
  if (options?.keyResolver) {
    return _verifyChainAsync(chain, options as VerifyOptions & { keyResolver: KeyResolver });
  }
  return _verifyChainSync(chain, options);
}

function _verifyChainSync(chain: Chain, options?: Omit<VerifyOptions, "keyResolver">): VerificationResult {
  const { blocks, metadata } = chain;
  const { hashAlgorithm, signatureScheme, chainId } = metadata;
  const allErrors: VerificationError[] = [];
  let lastVerifiedBlock = -1;
  const seenBlockNumbers = new Set<number>();

  const forkGenesisIndex = blocks.findIndex(
    (b) => !b.provenance && (isGenesisBlock(b) || isForkGenesisBlock(b)),
  );

  const forkGenesis = forkGenesisIndex >= 0 ? blocks[forkGenesisIndex] : undefined;
  const contentSchema = (forkGenesis as GenesisBlock | undefined)?.contentSchema;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block === undefined) continue;
    const errorsBeforeThisBlock = allErrors.length;
    const isProvenance = block.provenance === true;

    if (seenBlockNumbers.has(block.blockNumber)) {
      allErrors.push({
        code: ErrorCode.DUPLICATE_BLOCK,
        blockNumber: block.blockNumber,
        message: `Duplicate block number ${block.blockNumber}`,
      });
    }
    seenBlockNumbers.add(block.blockNumber);

    if (!isProvenance && block.chainId !== chainId) {
      allErrors.push({
        code: ErrorCode.BROKEN_CHAIN,
        blockNumber: block.blockNumber,
        message: `Block ${block.blockNumber} chainId mismatch: expected ${chainId}, got ${block.chainId}`,
      });
    }

    if (i === 0) {
      if (!isGenesisBlock(block) || block.previousHash !== null) {
        allErrors.push({
          code: ErrorCode.BROKEN_CHAIN,
          blockNumber: 0,
          message: "First block must be a genesis block with previousHash null",
        });
      }
    }

    if (i > 0) {
      const prevBlock = blocks[i - 1];
      if (!isProvenance && i === forkGenesisIndex && isForkGenesisBlock(block)) {
        const lastProvenanceBlock = blocks[i - 1];
        if (
          lastProvenanceBlock !== undefined &&
          block.forkSourceBlockHash !== lastProvenanceBlock.hash
        ) {
          allErrors.push({
            code: ErrorCode.BROKEN_CHAIN,
            blockNumber: block.blockNumber,
            message: `Fork genesis forkSourceBlockHash does not match last provenance block hash`,
          });
        }
      } else if (prevBlock !== undefined && block.previousHash !== prevBlock.hash) {
        allErrors.push({
          code: ErrorCode.BROKEN_CHAIN,
          blockNumber: block.blockNumber,
          message: `Block ${block.blockNumber} previousHash does not match block ${block.blockNumber - 1} hash`,
        });
      }
    }

    const useGenesisCanonical = isGenesisBlock(block) || isForkGenesisBlock(block);
    const canonical = useGenesisCanonical
      ? genesisCanonical(block as GenesisBlock)
      : blockCanonical(block);

    const hashResult = hashBlock(canonical, hashAlgorithm);
    if (!hashResult.ok) {
      allErrors.push({
        code: hashResult.error.code,
        blockNumber: block.blockNumber,
        message: hashResult.error.message,
      });
    } else if (hashResult.value !== block.hash) {
      allErrors.push({
        code: ErrorCode.BROKEN_CHAIN,
        blockNumber: block.blockNumber,
        message: `Block ${block.blockNumber} hash mismatch — content may have been tampered with`,
      });
    }

    // Use options.publicKey override if supplied, otherwise use block's own public key
    const resolvedKey = options?.publicKey ?? block.publicKey;
    if (!resolvedKey) {
      allErrors.push({
        code: ErrorCode.MISSING_KEY,
        blockNumber: block.blockNumber,
        message: `No public key available to verify block ${block.blockNumber}`,
      });
    } else {
      const sigResult = cryptoVerify(canonical, block.signature, resolvedKey, signatureScheme);
      if (!sigResult.ok) {
        allErrors.push({
          code: sigResult.error.code,
          blockNumber: block.blockNumber,
          message: sigResult.error.message,
        });
      } else if (!sigResult.value) {
        allErrors.push({
          code: ErrorCode.INVALID_SIGNATURE,
          blockNumber: block.blockNumber,
          message: `Block ${block.blockNumber} signature is invalid`,
        });
      }
    }

    if (new Date(block.timestamp).getTime() > Date.now() + FUTURE_TIMESTAMP_TOLERANCE_MS) {
      allErrors.push({
        code: ErrorCode.FUTURE_TIMESTAMP,
        blockNumber: block.blockNumber,
        message: `Block ${block.blockNumber} timestamp is too far in the future`,
      });
    }

    if (
      i > forkGenesisIndex &&
      contentSchema !== undefined &&
      options?.validateContent !== undefined
    ) {
      const validationResult = options.validateContent(block.content, contentSchema);
      if (!validationResult.valid) {
        allErrors.push({
          code: ErrorCode.SCHEMA_VIOLATION,
          blockNumber: block.blockNumber,
          message: `Block ${block.blockNumber} content failed genesis schema validation`,
          schemaErrors: validationResult.errors,
        });
      }
    }

    if (allErrors.length === errorsBeforeThisBlock) {
      lastVerifiedBlock = i;
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    blockCount: blocks.length,
    lastVerifiedBlock,
  };
}

async function _verifyChainAsync(
  chain: Chain,
  options: VerifyOptions & { keyResolver: KeyResolver },
): Promise<VerificationResult> {
  const { blocks, metadata } = chain;
  const { hashAlgorithm, signatureScheme, chainId } = metadata;
  const allErrors: VerificationError[] = [];
  let lastVerifiedBlock = -1;
  const seenBlockNumbers = new Set<number>();

  const forkGenesisIndex = blocks.findIndex(
    (b) => !b.provenance && (isGenesisBlock(b) || isForkGenesisBlock(b)),
  );

  const forkGenesis = forkGenesisIndex >= 0 ? blocks[forkGenesisIndex] : undefined;
  const contentSchema = (forkGenesis as GenesisBlock | undefined)?.contentSchema;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block === undefined) continue;
    const errorsBeforeThisBlock = allErrors.length;
    const isProvenance = block.provenance === true;

    if (seenBlockNumbers.has(block.blockNumber)) {
      allErrors.push({
        code: ErrorCode.DUPLICATE_BLOCK,
        blockNumber: block.blockNumber,
        message: `Duplicate block number ${block.blockNumber}`,
      });
    }
    seenBlockNumbers.add(block.blockNumber);

    if (!isProvenance && block.chainId !== chainId) {
      allErrors.push({
        code: ErrorCode.BROKEN_CHAIN,
        blockNumber: block.blockNumber,
        message: `Block ${block.blockNumber} chainId mismatch: expected ${chainId}, got ${block.chainId}`,
      });
    }

    if (i === 0) {
      if (!isGenesisBlock(block) || block.previousHash !== null) {
        allErrors.push({
          code: ErrorCode.BROKEN_CHAIN,
          blockNumber: 0,
          message: "First block must be a genesis block with previousHash null",
        });
      }
    }

    if (i > 0) {
      const prevBlock = blocks[i - 1];
      if (!isProvenance && i === forkGenesisIndex && isForkGenesisBlock(block)) {
        const lastProvenanceBlock = blocks[i - 1];
        if (
          lastProvenanceBlock !== undefined &&
          block.forkSourceBlockHash !== lastProvenanceBlock.hash
        ) {
          allErrors.push({
            code: ErrorCode.BROKEN_CHAIN,
            blockNumber: block.blockNumber,
            message: `Fork genesis forkSourceBlockHash does not match last provenance block hash`,
          });
        }
      } else if (prevBlock !== undefined && block.previousHash !== prevBlock.hash) {
        allErrors.push({
          code: ErrorCode.BROKEN_CHAIN,
          blockNumber: block.blockNumber,
          message: `Block ${block.blockNumber} previousHash does not match block ${block.blockNumber - 1} hash`,
        });
      }
    }

    const useGenesisCanonical = isGenesisBlock(block) || isForkGenesisBlock(block);
    const canonical = useGenesisCanonical
      ? genesisCanonical(block as GenesisBlock)
      : blockCanonical(block);

    const hashResult = hashBlock(canonical, hashAlgorithm);
    if (!hashResult.ok) {
      allErrors.push({
        code: hashResult.error.code,
        blockNumber: block.blockNumber,
        message: hashResult.error.message,
      });
    } else if (hashResult.value !== block.hash) {
      allErrors.push({
        code: ErrorCode.BROKEN_CHAIN,
        blockNumber: block.blockNumber,
        message: `Block ${block.blockNumber} hash mismatch — content may have been tampered with`,
      });
    }

    // Resolve key via keyResolver for this block
    let resolvedKey: string | undefined;
    try {
      resolvedKey = await options.keyResolver(i, block.publicKey);
    } catch {
      allErrors.push({
        code: ErrorCode.MISSING_KEY,
        blockNumber: block.blockNumber,
        message: `keyResolver threw for block ${block.blockNumber}`,
      });
    }

    if (!resolvedKey) {
      allErrors.push({
        code: ErrorCode.MISSING_KEY,
        blockNumber: block.blockNumber,
        message: `keyResolver returned no key for block ${block.blockNumber}`,
      });
    } else {
      const sigResult = cryptoVerify(canonical, block.signature, resolvedKey, signatureScheme);
      if (!sigResult.ok) {
        allErrors.push({
          code: sigResult.error.code,
          blockNumber: block.blockNumber,
          message: sigResult.error.message,
        });
      } else if (!sigResult.value) {
        allErrors.push({
          code: ErrorCode.INVALID_SIGNATURE,
          blockNumber: block.blockNumber,
          message: `Block ${block.blockNumber} signature is invalid`,
        });
      }
    }

    if (new Date(block.timestamp).getTime() > Date.now() + FUTURE_TIMESTAMP_TOLERANCE_MS) {
      allErrors.push({
        code: ErrorCode.FUTURE_TIMESTAMP,
        blockNumber: block.blockNumber,
        message: `Block ${block.blockNumber} timestamp is too far in the future`,
      });
    }

    if (
      i > forkGenesisIndex &&
      contentSchema !== undefined &&
      options?.validateContent !== undefined
    ) {
      const validationResult = options.validateContent(block.content, contentSchema);
      if (!validationResult.valid) {
        allErrors.push({
          code: ErrorCode.SCHEMA_VIOLATION,
          blockNumber: block.blockNumber,
          message: `Block ${block.blockNumber} content failed genesis schema validation`,
          schemaErrors: validationResult.errors,
        });
      }
    }

    if (allErrors.length === errorsBeforeThisBlock) {
      lastVerifiedBlock = i;
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    blockCount: blocks.length,
    lastVerifiedBlock,
  };
}
