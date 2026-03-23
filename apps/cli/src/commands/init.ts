import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createChain, generateKeypair } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { Command } from "commander";
import { writeConfig } from "../utils/config.js";
import { printError, printHuman, printJson, setJsonMode } from "../utils/output.js";

export function makeInitCommand(): Command {
  return new Command("init")
    .description("Initialise a glorychain project in the current directory")
    .option("--dir <dir>", "Chain storage directory", "chains")
    .option("--purpose <purpose>", "Chain purpose", "general")
    .option("--content <text>", "Genesis block content (required to create a genesis block)")
    .option(
      "--key <privateKey>",
      "Ed25519 private key (base64url) — if omitted, a new keypair is generated",
    )
    .option(
      "--pubkey <publicKey>",
      "Ed25519 public key (base64url) — required if --key is provided",
    )
    .option("--json", "Output as JSON")
    .action(
      async (opts: {
        dir: string;
        purpose: string;
        content?: string;
        key?: string;
        pubkey?: string;
        json?: boolean;
      }) => {
        if (opts.json) setJsonMode(true);

        const chainsDir = resolve(opts.dir);

        // Create chains directory
        await mkdir(chainsDir, { recursive: true });
        if (!opts.json) printHuman("created", opts.dir);

        // Write local config
        await writeConfig({ connector: "fs", chainIds: [] });
        if (!opts.json) printHuman("config", ".glorychain/config.json");

        // Write CHAIN_CHARTER.md template if it doesn't exist
        const charterPath = join(process.cwd(), "CHAIN_CHARTER.md");
        try {
          await writeFile(
            charterPath,
            [
              "# Chain Charter",
              "",
              "<!-- Describe the purpose and governance rules of this chain. -->",
              "",
              "## Purpose",
              "",
              "## Signatories",
              "",
              "## Governance rules",
              "",
            ].join("\n"),
            { flag: "wx" }, // fail if already exists
          );
          if (!opts.json) printHuman("created", "CHAIN_CHARTER.md");
        } catch {
          // Already exists — skip silently
        }

        // If --content provided, create a genesis block
        if (opts.content !== undefined) {
          let privateKey: string;
          let publicKey: string;

          if (opts.key !== undefined && opts.pubkey !== undefined) {
            privateKey = opts.key;
            publicKey = opts.pubkey;
          } else {
            const kp = generateKeypair();
            if (!kp.ok) {
              printError(kp.error.message);
              process.exit(1);
            }
            privateKey = kp.value.privateKey;
            publicKey = kp.value.publicKey;
            if (!opts.json) {
              process.stdout.write(
                [
                  "",
                  "Generated keypair — save your private key, it cannot be recovered:",
                  `  Public key:  ${publicKey}`,
                  `  Private key: ${privateKey}`,
                  "",
                ].join("\n"),
              );
            } else {
              printJson({ publicKey, privateKey });
            }
          }

          const result = createChain(
            {
              content: opts.content,
              purpose: opts.purpose,
              creatorId: "anonymous",
              identityType: "anonymous",
              publicKey,
            },
            privateKey,
          );

          if (!result.ok) {
            printError(result.error.message);
            process.exit(1);
          }

          const connector = new FsConnector(chainsDir);
          await connector.write(result.value);
          if (!opts.json) printHuman("chainId", result.value.metadata.chainId);
          else printJson({ chainId: result.value.metadata.chainId });
        }

        if (!opts.json) {
          process.stdout.write(
            [
              "",
              "Initialised. Next steps:",
              `  glorychain keygen`,
              `  glorychain create --key <key> --pubkey <pubkey> --content "$(cat CHAIN_CHARTER.md)"`,
              "",
            ].join("\n"),
          );
        }
      },
    );
}
