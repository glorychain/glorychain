import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createChain, generateKeypair } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { Command } from "commander";
import { writeConfig } from "../utils/config.js";
import {
  printError,
  printHuman,
  printJson,
  printSection,
  printStep,
  printSuccess,
  setJsonMode,
} from "../utils/output.js";

const GITHUB_WORKFLOW_GENESIS = `name: Glorychain genesis

on:
  push:
    branches: [main]

jobs:
  genesis:
    name: Create chain genesis block
    runs-on: ubuntu-latest
    # Only runs once — skipped if the chain file already exists
    steps:
      - uses: actions/checkout@v4

      - name: Check if chain already exists
        id: check
        run: |
          if ls chains/*.json 1>/dev/null 2>&1; then
            echo "exists=true" >> "$GITHUB_OUTPUT"
          else
            echo "exists=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Install glorychain CLI
        if: steps.check.outputs.exists == 'false'
        run: npm install -g glorychain

      - name: Create genesis block
        if: steps.check.outputs.exists == 'false'
        env:
          CHAIN_PRIVATE_KEY: \${{ secrets.CHAIN_PRIVATE_KEY }}
          CHAIN_PUBLIC_KEY: \${{ secrets.CHAIN_PUBLIC_KEY }}
        run: |
          mkdir -p chains
          glorychain create \\
            --key "$CHAIN_PRIVATE_KEY" \\
            --pubkey "$CHAIN_PUBLIC_KEY" \\
            --content "$(cat CHAIN_CHARTER.md)" \\
            --purpose "github-audit-log" \\
            --dir chains

      - name: Commit chain
        if: steps.check.outputs.exists == 'false'
        run: |
          git config user.name "glorychain-bot"
          git config user.email "glorychain-bot@users.noreply.github.com"
          git add chains/
          git commit -m "chore: create chain genesis block"
          git push
`;

const GITHUB_WORKFLOW_APPEND = `name: Glorychain append

on:
  push:
    branches: [main]

jobs:
  append:
    name: Append merge to chain
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check if chain exists
        id: check
        run: |
          CHAIN_FILE=$(ls chains/*.json 2>/dev/null | head -1)
          if [ -z "$CHAIN_FILE" ]; then
            echo "exists=false" >> "$GITHUB_OUTPUT"
          else
            CHAIN_ID=$(basename "$CHAIN_FILE" .json)
            echo "exists=true" >> "$GITHUB_OUTPUT"
            echo "chain_id=$CHAIN_ID" >> "$GITHUB_OUTPUT"
          fi

      - name: Install glorychain CLI
        if: steps.check.outputs.exists == 'true'
        run: npm install -g glorychain

      - name: Append merge block
        if: steps.check.outputs.exists == 'true'
        env:
          CHAIN_PRIVATE_KEY: \${{ secrets.CHAIN_PRIVATE_KEY }}
          CHAIN_PUBLIC_KEY: \${{ secrets.CHAIN_PUBLIC_KEY }}
        run: |
          glorychain append \\
            --chain "\${{ steps.check.outputs.chain_id }}" \\
            --key "$CHAIN_PRIVATE_KEY" \\
            --pubkey "$CHAIN_PUBLIC_KEY" \\
            --content "MERGE: \${{ github.event.head_commit.message }} — \${{ github.sha }}" \\
            --dir chains

      - name: Commit chain update
        if: steps.check.outputs.exists == 'true'
        run: |
          git config user.name "glorychain-bot"
          git config user.email "glorychain-bot@users.noreply.github.com"
          git add chains/
          git commit -m "chore: append block [\${{ github.sha }}]"
          git push
`;

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
    .option("--github", "Scaffold GitHub Actions workflows for automated chain management")
    .option("--json", "Output as JSON")
    .action(
      async (opts: {
        dir: string;
        purpose: string;
        content?: string;
        key?: string;
        pubkey?: string;
        github?: boolean;
        json?: boolean;
      }) => {
        if (opts.json) setJsonMode(true);

        const chainsDir = resolve(opts.dir);

        // Create chains directory
        await mkdir(chainsDir, { recursive: true });
        if (!opts.json) printHuman("chains dir", opts.dir);

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

        // Scaffold GitHub Actions workflows if --github flag set
        if (opts.github) {
          const workflowsDir = join(process.cwd(), ".github", "workflows");
          await mkdir(workflowsDir, { recursive: true });

          await writeFile(join(workflowsDir, "chain-genesis.yml"), GITHUB_WORKFLOW_GENESIS, {
            flag: "wx",
          }).catch(() => {});
          await writeFile(join(workflowsDir, "chain-append.yml"), GITHUB_WORKFLOW_APPEND, {
            flag: "wx",
          }).catch(() => {});

          if (!opts.json) {
            printHuman("created", ".github/workflows/chain-genesis.yml");
            printHuman("created", ".github/workflows/chain-append.yml");
            printSection("Add CHAIN_PRIVATE_KEY and CHAIN_PUBLIC_KEY to your GitHub repo secrets");
          }
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
              printSection("Generated keypair — save your private key, it cannot be recovered");
              printHuman("publicKey", publicKey);
              printHuman("privateKey", privateKey);
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
          if (!opts.json) {
            printSuccess("Genesis block created");
            printHuman("chainId", result.value.metadata.chainId);
          } else {
            printJson({ chainId: result.value.metadata.chainId });
          }
        }

        if (!opts.json) {
          printSuccess("Initialised");
          printSection("Next steps");
          printStep("glorychain keygen");
          printStep(
            `glorychain create --key <key> --pubkey <pubkey> --content "$(cat CHAIN_CHARTER.md)"`,
          );
          if (!opts.github) {
            printStep("glorychain init --github   # scaffold GitHub Actions workflows");
          }
          process.stdout.write("\n");
        }
      },
    );
}
