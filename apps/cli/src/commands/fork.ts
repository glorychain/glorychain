import { forkChain } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { Command } from "commander";
import { printError, printHuman, setJsonMode } from "../utils/output.js";

export function makeForkCommand(): Command {
  return new Command("fork")
    .description("Fork a chain from a specific block")
    .requiredOption("--chain <chainId>", "Source chain ID")
    .requiredOption("--block <n>", "Block number to fork from")
    .requiredOption("--key <privateKey>", "Ed25519 private key (base64url)")
    .requiredOption("--pubkey <publicKey>", "Ed25519 public key (base64url)")
    .requiredOption("--content <text>", "Fork genesis block content")
    .option("--purpose <purpose>", "Fork purpose", "fork")
    .option("--creator <creatorId>", "Creator ID", "anonymous")
    .option("--dir <dir>", "Chain storage directory", "./chains")
    .option("--json", "Output as JSON")
    .action(
      async (opts: {
        chain: string;
        block: string;
        key: string;
        pubkey: string;
        content: string;
        purpose: string;
        creator: string;
        dir: string;
        json?: boolean;
      }) => {
        if (opts.json) setJsonMode(true);
        const connector = new FsConnector(opts.dir);
        const source = await connector.read(opts.chain).catch((err: unknown) => {
          printError(String(err));
          process.exit(1);
        });
        const blockNumber = Number.parseInt(opts.block, 10);
        const result = forkChain(
          source,
          blockNumber,
          {
            content: opts.content,
            purpose: opts.purpose,
            creatorId: opts.creator,
            identityType: "anonymous",
            publicKey: opts.pubkey,
          },
          opts.key,
        );
        if (!result.ok) {
          printError(result.error.message);
          process.exit(1);
        }
        await connector.write(result.value);
        printHuman("chainId", result.value.metadata.chainId);
      },
    );
}
