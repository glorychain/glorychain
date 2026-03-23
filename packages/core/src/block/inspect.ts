import { hashBlock } from "../crypto/hash.js";
import type { Block, GenesisBlock } from "../schema/block.js";
import type { GloryChainError, Result } from "../schema/errors.js";
import { blockCanonical, genesisCanonical } from "./canonical.js";

export type BlockInspection =
  | { type: "genesis"; block: GenesisBlock }
  | { type: "block"; block: Block };

export function isGenesisBlock(block: Block | GenesisBlock): block is GenesisBlock {
  return block.blockNumber === 0;
}

export function inspectBlock(block: Block | GenesisBlock): BlockInspection {
  if (isGenesisBlock(block)) {
    return { type: "genesis", block };
  }
  return { type: "block", block };
}

export function computeBlockHash(
  block: Block | GenesisBlock,
  algorithm: string,
): Result<string, GloryChainError> {
  const canonical = isGenesisBlock(block) ? genesisCanonical(block) : blockCanonical(block);
  return hashBlock(canonical, algorithm);
}
