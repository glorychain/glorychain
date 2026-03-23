import { inspectBlock } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { Command } from "commander";
import { isJsonMode, printError, printHuman, printJson, setJsonMode } from "../utils/output.js";

export function makeInspectCommand(): Command {
  return new Command("inspect")
    .description("Inspect a block's raw structure")
    .requiredOption("--chain <chainId>", "Chain ID")
    .requiredOption("--block <n>", "Block index")
    .option("--dir <dir>", "Chain storage directory", "./chains")
    .option("--json", "Output as JSON")
    .action(async (opts: { chain: string; block: string; dir: string; json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      const connector = new FsConnector(opts.dir);
      const chain = await connector.read(opts.chain).catch((err: unknown) => {
        printError(String(err));
        process.exit(1);
      });
      const blockIndex = Number.parseInt(opts.block, 10);
      const block = chain.blocks[blockIndex];
      if (block === undefined) {
        printError(`Block ${blockIndex} not found in chain ${opts.chain}`);
        process.exit(1);
      }
      const inspection = inspectBlock(block);
      if (isJsonMode()) {
        printJson(inspection);
      } else {
        printHuman("type", inspection.type);
        printHuman("blockNumber", String(inspection.block.blockNumber));
        printHuman("hash", inspection.block.hash);
        printHuman("content", inspection.block.content);
        printHuman("timestamp", inspection.block.timestamp);
      }
    });
}
