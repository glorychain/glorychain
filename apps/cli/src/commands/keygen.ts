import { CUSTODY_WARNING, generateKeypair } from "@glorychain/core";
import { Command } from "commander";
import { isJsonMode, printHuman, printJson, printSection, setJsonMode } from "../utils/output.js";

export function makeKeygenCommand(): Command {
  return new Command("keygen")
    .description("Generate a new Ed25519 keypair")
    .option("--json", "Output as JSON")
    .action((opts: { json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      // FR7/NFR9: Mandatory custody warning before any key output
      process.stderr.write(`${CUSTODY_WARNING}\n`);
      const result = generateKeypair();
      if (!result.ok) {
        process.stderr.write(`Error: ${result.error.message}\n`);
        process.exit(1);
      }
      if (isJsonMode()) {
        printJson({ publicKey: result.value.publicKey, privateKey: result.value.privateKey });
      } else {
        printSection("Generated keypair");
        printHuman("publicKey", result.value.publicKey);
        printHuman("privateKey", result.value.privateKey);
      }
    });
}
