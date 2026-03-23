import { FsConnector } from "@glorychain/fs";
import { Command } from "commander";
import {
  isJsonMode,
  printError,
  printHuman,
  printJson,
  printSuccess,
  setJsonMode,
} from "../utils/output.js";

export function makeVerifyCommand(): Command {
  return new Command("verify")
    .description("Verify chain integrity")
    .requiredOption("--chain <chainId>", "Chain ID")
    .option("--dir <dir>", "Chain storage directory", "./chains")
    .option("--json", "Output as JSON")
    .action(async (opts: { chain: string; dir: string; json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      const connector = new FsConnector(opts.dir);
      const result = await connector.verify(opts.chain).catch((err: unknown) => {
        printError(String(err));
        process.exit(1);
      });
      if (isJsonMode()) {
        printJson(result);
      } else if (result.valid) {
        printSuccess("Chain verified — all blocks intact");
        printHuman("valid", "true");
      } else {
        printHuman("valid", "false");
        for (const e of result.errors) {
          printError(`block ${e.blockNumber}: ${e.message}`);
        }
      }
      if (!result.valid) process.exit(1);
    });
}
