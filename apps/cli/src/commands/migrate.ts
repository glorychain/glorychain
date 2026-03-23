import { FsConnector } from "@glorychain/fs";
import { Command } from "commander";
import { printError, printHuman, setJsonMode } from "../utils/output.js";

export function makeMigrateCommand(): Command {
  return new Command("migrate")
    .description("Migrate a chain between connectors")
    .requiredOption("--chain <chainId>", "Chain ID")
    .requiredOption("--from <srcDir>", "Source directory")
    .requiredOption("--to <destDir>", "Destination directory")
    .option("--json", "Output as JSON")
    .action(async (opts: { chain: string; from: string; to: string; json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      const source = new FsConnector(opts.from);
      const target = new FsConnector(opts.to);
      await source.migrate(opts.chain, target).catch((err: unknown) => {
        printError(String(err));
        process.exit(1);
      });
      printHuman("status", "migrated");
    });
}
