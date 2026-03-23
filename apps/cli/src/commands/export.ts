import { writeFile } from "node:fs/promises";
import { FsConnector } from "@glorychain/fs";
import { Command } from "commander";
import { printError, printHuman, setJsonMode } from "../utils/output.js";

export function makeExportCommand(): Command {
  return new Command("export")
    .description("Export a chain as a portable offline-verifiable archive")
    .requiredOption("--chain <chainId>", "Chain ID")
    .option("--dir <dir>", "Chain storage directory", "./chains")
    .option("--out <file>", "Output file path (default: stdout)")
    .option("--json", "Output as JSON")
    .action(async (opts: { chain: string; dir: string; out?: string; json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      const connector = new FsConnector(opts.dir);
      const chain = await connector.read(opts.chain).catch((err: unknown) => {
        printError(String(err));
        process.exit(1);
      });
      const archive = JSON.stringify({ exportedAt: new Date().toISOString(), chain }, null, 2);
      if (opts.out) {
        await writeFile(opts.out, archive, "utf8");
        printHuman("exported", opts.out);
      } else {
        process.stdout.write(`${archive}\n`);
      }
    });
}
