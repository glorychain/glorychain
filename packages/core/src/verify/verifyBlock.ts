import {
  blockCanonical,
  computeBlockHash,
  genesisCanonical,
  isGenesisBlock,
} from "../block/index.js";
import { verifyBlock as cryptoVerify } from "../crypto/sign.js";
import type { Block, GenesisBlock } from "../schema/block.js";
import { ErrorCode } from "../schema/errors.js";
import type { VerificationError, VerificationResult } from "../schema/verification.js";

const FUTURE_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

export function verifySingleBlock(
  block: Block | GenesisBlock,
  hashAlgorithm: string,
  signatureScheme: string,
): VerificationResult {
  const errors: VerificationError[] = [];

  const hashResult = computeBlockHash(block, hashAlgorithm);
  if (!hashResult.ok) {
    errors.push({
      code: hashResult.error.code,
      blockNumber: block.blockNumber,
      message: hashResult.error.message,
    });
  } else if (hashResult.value !== block.hash) {
    errors.push({
      code: ErrorCode.BROKEN_CHAIN,
      blockNumber: block.blockNumber,
      message: `Block ${block.blockNumber} hash mismatch — content may have been tampered with`,
    });
  }

  const canonical = isGenesisBlock(block) ? genesisCanonical(block) : blockCanonical(block);
  const sigResult = cryptoVerify(canonical, block.signature, block.publicKey, signatureScheme);
  if (!sigResult.ok) {
    errors.push({
      code: sigResult.error.code,
      blockNumber: block.blockNumber,
      message: sigResult.error.message,
    });
  } else if (!sigResult.value) {
    errors.push({
      code: ErrorCode.INVALID_SIGNATURE,
      blockNumber: block.blockNumber,
      message: `Block ${block.blockNumber} signature is invalid`,
    });
  }

  if (new Date(block.timestamp).getTime() > Date.now() + FUTURE_TIMESTAMP_TOLERANCE_MS) {
    errors.push({
      code: ErrorCode.FUTURE_TIMESTAMP,
      blockNumber: block.blockNumber,
      message: `Block ${block.blockNumber} timestamp is too far in the future`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    blockCount: 1,
    lastVerifiedBlock: errors.length === 0 ? 0 : -1,
  };
}
