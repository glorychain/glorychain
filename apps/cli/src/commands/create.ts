import { createChain } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { Command } from "commander";
import { printError, printHuman, setJsonMode } from "../utils/output.js";

export function makeCreateCommand(): Command {
  return new Command("create")
    .description("Create a new chain")
    .requiredOption("--key <privateKey>", "Ed25519 private key (base64url)")
    .requiredOption("--pubkey <publicKey>", "Ed25519 public key (base64url)")
    .requiredOption("--content <text>", "Genesis block content")
    .option("--purpose <purpose>", "Chain purpose", "general")
    .option("--creator <creatorId>", "Creator ID", "anonymous")
    .option("--dir <dir>", "Chain storage directory", "./chains")
    .option("--json", "Output as JSON")
    .action(
      async (opts: {
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
        const result = createChain(
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
