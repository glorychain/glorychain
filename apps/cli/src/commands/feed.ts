import { generateFeed } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { Command } from "commander";
import { printError, setJsonMode } from "../utils/output.js";

export function makeFeedCommand(): Command {
  return new Command("feed")
    .description("Generate Atom 1.0 RSS feed for a chain")
    .requiredOption("--chain <chainId>", "Chain ID")
    .option("--dir <dir>", "Chain storage directory", "./chains")
    .option("--base-url <url>", "Base URL for feed links", "https://glorychain.dev")
    .option("--json", "Output as JSON")
    .action(async (opts: { chain: string; dir: string; baseUrl: string; json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      const connector = new FsConnector(opts.dir);
      const chain = await connector.read(opts.chain).catch((err: unknown) => {
        printError(String(err));
        process.exit(1);
      });
      const xml = generateFeed(chain, { selfUrl: opts.baseUrl });
      process.stdout.write(`${xml}\n`);
    });
}
