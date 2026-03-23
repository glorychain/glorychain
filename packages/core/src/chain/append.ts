import { isGenesisBlock } from "../block/index.js";
import { hashBlock } from "../crypto/hash.js";
import { signBlock } from "../crypto/sign.js";
import type { Block, ISO8601 } from "../schema/block.js";
import type { Chain } from "../schema/chain.js";
import type { GloryChainError, Result } from "../schema/errors.js";
import { ErrorCode } from "../schema/errors.js";
import type { ContentValidator } from "../validate/types.js";
import { PROTOCOL_VERSION } from "./create.js";

export interface AppendBlockInput {
  content: string;
  publicKey: string;
}

export interface AppendOptions {
  /** Optional content validator — used when the chain's genesis block defines a contentSchema.
   *  If omitted, schema validation is skipped even if contentSchema is present.
   *  Existing callers that omit this option are completely unaffected.
   *  Use createAjvValidator() from @glorychain/core for the reference implementation. */
  validateContent?: ContentValidator;
}

export function appendBlock(
  chain: Chain,
  input: AppendBlockInput,
  privateKey: string,
  options?: AppendOptions,
): Result<Chain, GloryChainError> {
  const { content, publicKey } = input;

  const lastBlock = chain.blocks[chain.blocks.length - 1];
  if (lastBlock === undefined) {
    return {
      ok: false,
      error: { code: ErrorCode.BROKEN_CHAIN, message: "Chain has no blocks" },
    };
  }

  // Schema validation — run before signing so invalid content is never committed
  const genesis = chain.blocks[0];
  if (
    genesis !== undefined &&
    isGenesisBlock(genesis) &&
    genesis.contentSchema !== undefined &&
    options?.validateContent !== undefined
  ) {
    const validationResult = options.validateContent(content, genesis.contentSchema);
    if (!validationResult.valid) {
      return {
        ok: false,
        error: {
          code: ErrorCode.SCHEMA_VIOLATION,
          message: "Block content failed genesis schema validation",
          blockNumber: chain.blocks.length,
          schemaErrors: validationResult.errors,
        },
      };
    }
  }

  const blockNumber = chain.blocks.length;
  const chainId = chain.metadata.chainId;
  const previousHash = lastBlock.hash;
  const timestamp = new Date().toISOString() as ISO8601;
  const protocolVersion = PROTOCOL_VERSION;
  const { hashAlgorithm, signatureScheme } = chain.metadata;

  const canonical = JSON.stringify({
    blockNumber,
    chainId,
    content,
    timestamp,
    previousHash,
    protocolVersion,
  });

  const hashResult = hashBlock(canonical, hashAlgorithm);
  if (!hashResult.ok) return hashResult;

  const signResult = signBlock(canonical, privateKey, signatureScheme);
  if (!signResult.ok) return signResult;

  const newBlock: Block = {
    blockNumber,
    chainId,
    content,
    timestamp,
    previousHash,
    hash: hashResult.value,
    signature: signResult.value,
    publicKey,
    protocolVersion,
  };

  const newBlocks = [...chain.blocks, newBlock] as [(typeof chain.blocks)[0], ...Block[]];
  return { ok: true, value: { ...chain, blocks: newBlocks } };
}
