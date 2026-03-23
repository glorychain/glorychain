import { appendBlock } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { Command } from "commander";
import { printError, printHuman, printSuccess, setJsonMode } from "../utils/output.js";

export function makeAppendCommand(): Command {
  return new Command("append")
    .description("Append a block to an existing chain")
    .requiredOption("--chain <chainId>", "Chain ID")
    .requiredOption("--key <privateKey>", "Ed25519 private key (base64url)")
    .requiredOption("--pubkey <publicKey>", "Ed25519 public key (base64url)")
    .requiredOption("--content <text>", "Block content")
    .option("--dir <dir>", "Chain storage directory", "./chains")
    .option("--json", "Output as JSON")
    .action(
      async (opts: {
        chain: string;
        key: string;
        pubkey: string;
        content: string;
        dir: string;
        json?: boolean;
      }) => {
        if (opts.json) setJsonMode(true);
        const connector = new FsConnector(opts.dir);
        const chain = await connector.read(opts.chain).catch((err: unknown) => {
          printError(String(err));
          process.exit(1);
        });
        const result = appendBlock(
          chain,
          { content: opts.content, publicKey: opts.pubkey },
          opts.key,
        );
        if (!result.ok) {
          printError(result.error.message);
          process.exit(1);
        }
        await connector.write(result.value);
        const blockNumber = result.value.blocks.length - 1;
        printSuccess("Block appended");
        printHuman("blockNumber", String(blockNumber));
      },
    );
}
