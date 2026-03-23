import { describe, expectTypeOf, it } from "vitest";
import type { Block, ExternalAnchor, ForkGenesisBlock, GenesisBlock, ISO8601 } from "./block.js";

describe("Block types", () => {
  it("Block has all required fields with correct types", () => {
    expectTypeOf<Block["blockNumber"]>().toEqualTypeOf<number>();
    expectTypeOf<Block["chainId"]>().toEqualTypeOf<string>();
    expectTypeOf<Block["content"]>().toEqualTypeOf<string>();
    expectTypeOf<Block["timestamp"]>().toEqualTypeOf<ISO8601>();
    expectTypeOf<Block["previousHash"]>().toEqualTypeOf<string>();
    expectTypeOf<Block["hash"]>().toEqualTypeOf<string>();
    expectTypeOf<Block["signature"]>().toEqualTypeOf<string>();
    expectTypeOf<Block["publicKey"]>().toEqualTypeOf<string>();
    expectTypeOf<Block["protocolVersion"]>().toEqualTypeOf<string>();
  });

  it("GenesisBlock blockNumber is literal type 0", () => {
    expectTypeOf<GenesisBlock["blockNumber"]>().toEqualTypeOf<0>();
  });

  it("GenesisBlock previousHash is null", () => {
    expectTypeOf<GenesisBlock["previousHash"]>().toEqualTypeOf<null>();
  });

  it("GenesisBlock has genesis-specific fields", () => {
    expectTypeOf<GenesisBlock["purpose"]>().toEqualTypeOf<string>();
    expectTypeOf<GenesisBlock["creatorId"]>().toEqualTypeOf<string>();
    expectTypeOf<GenesisBlock["hashAlgorithm"]>().toEqualTypeOf<string>();
    expectTypeOf<GenesisBlock["signatureScheme"]>().toEqualTypeOf<string>();
    expectTypeOf<GenesisBlock["identityType"]>().toEqualTypeOf<
      "oauth" | "external" | "anonymous"
    >();
  });

  it("GenesisBlock externalAnchor is optional", () => {
    expectTypeOf<GenesisBlock["externalAnchor"]>().toEqualTypeOf<ExternalAnchor | undefined>();
  });

  it("ForkGenesisBlock extends GenesisBlock with fork fields", () => {
    expectTypeOf<ForkGenesisBlock["forkOf"]>().toEqualTypeOf<string>();
    expectTypeOf<ForkGenesisBlock["forkFromBlock"]>().toEqualTypeOf<number>();
    expectTypeOf<ForkGenesisBlock["forkSourceBlockHash"]>().toEqualTypeOf<string>();
    expectTypeOf<ForkGenesisBlock["forkReason"]>().toEqualTypeOf<string | undefined>();
  });

  it("GenesisBlock is narrowable from Block union via blockNumber discriminant", () => {
    type BlockOrGenesis = Block | GenesisBlock;
    type NarrowedGenesis = Extract<BlockOrGenesis, { blockNumber: 0 }>;
    expectTypeOf<NarrowedGenesis>().toEqualTypeOf<GenesisBlock>();
  });
});
