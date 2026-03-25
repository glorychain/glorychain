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

// ─── Preset definitions ──────────────────────────────────────────────────────

const PRESETS = {
  governance: {
    purpose: "governance",
    charter: [
      "# Chain Charter — Governance",
      "",
      "This chain is a tamper-evident public record of all governance votes and decisions.",
      "Every motion, vote, and outcome is cryptographically signed and independently verifiable.",
      "",
      "## Purpose",
      "",
      "Record all governance motions and their outcomes.",
      "",
      "## Signatories",
      "",
      "<!-- List the keypair holders authorised to append to this chain. -->",
      "",
      "## Rules",
      "",
      "- Every motion must be opened before votes are cast",
      "- Motions are closed by an authorised signatory after the vote period ends",
      "- No block may be removed or altered after signing",
      "",
      "## Structure",
      "",
      "This chain uses `VoteRegister` from `@glorychain/structures` to derive current state.",
    ].join("\n"),
    hint: "Use VoteRegister from @glorychain/structures to query votes and outcomes.",
  },

  "board-decisions": {
    purpose: "board-decisions",
    charter: [
      "# Chain Charter — Board Decisions",
      "",
      "This chain is the binding decision register for this organisation.",
      "All resolutions are signed at the point of passing and cannot be silently amended.",
      "",
      "## Purpose",
      "",
      "Permanent, tamper-evident record of all board resolutions.",
      "",
      "## Signatories",
      "",
      "<!-- List the keypair holders authorised to append to this chain. -->",
      "",
      "## Rules",
      "",
      "- Resolutions are appended immediately after passing",
      "- Include vote count, date, and reference number in every block",
      "- Amendments reference the original resolution block number",
    ].join("\n"),
    hint: "Use DecisionLog from @glorychain/structures to query resolutions and supersessions.",
  },

  "audit-log": {
    purpose: "audit-log",
    charter: [
      "# Chain Charter — Audit Log",
      "",
      "This chain is a tamper-evident audit trail for all deployments and configuration changes.",
      "Every block is appended by CI and independently verifiable.",
      "",
      "## Purpose",
      "",
      "Attribute every deploy, config change, and rollback to a specific actor and timestamp.",
      "",
      "## Signatories",
      "",
      "<!-- Typically a CI bot keypair. Rotate on staff changes. -->",
      "",
      "## Rules",
      "",
      "- All production changes are appended automatically by CI",
      "- Human-triggered changes include the actor's ID",
      "- Rollbacks reference the original change block number",
    ].join("\n"),
    hint: "Use KeyValueStore from @glorychain/structures to track current config state.",
  },

  "policy-register": {
    purpose: "policy-register",
    charter: [
      "# Chain Charter — Policy Register",
      "",
      "This chain is the authoritative register of all active policies.",
      "Every publication, supersession, and withdrawal is permanently recorded.",
      "",
      "## Purpose",
      "",
      "Maintain a tamper-evident history of all policy documents.",
      "",
      "## Signatories",
      "",
      "<!-- List the keypair holders authorised to append to this chain. -->",
      "",
      "## Rules",
      "",
      "- Include document hash and version in every PUBLISH block",
      "- Superseded policies remain in the chain — never delete",
      "- Withdrawals include a reason",
    ].join("\n"),
    hint: "Use DocumentRegister from @glorychain/structures to query current and superseded policies.",
  },

  "membership-register": {
    purpose: "membership",
    charter: [
      "# Chain Charter — Membership Register",
      "",
      "This chain is the authoritative membership register for this organisation.",
      "All joins, departures, and role changes are permanently recorded.",
      "",
      "## Purpose",
      "",
      "Tamper-evident record of all current and historical members.",
      "",
      "## Signatories",
      "",
      "<!-- List the keypair holders authorised to append to this chain. -->",
      "",
      "## Rules",
      "",
      "- All membership changes are appended at the point of decision",
      "- Departed members remain in the chain — active: false",
      "- Role changes include the authorising signatory",
    ].join("\n"),
    hint: "Use MemberSet from @glorychain/structures to query active members and roles.",
  },
} as const;

type Preset = keyof typeof PRESETS;
const PRESET_NAMES = Object.keys(PRESETS) as Preset[];

export function makeInitCommand(): Command {
  return new Command("init")
    .description("Initialise a glorychain project in the current directory")
    .option("--dir <dir>", "Chain storage directory", "chains")
    .option("--purpose <purpose>", "Chain purpose (overridden by --preset)", "general")
    .option("--content <text>", "Genesis block content (required to create a genesis block)")
    .option("--preset <preset>", `Scaffold a preset chain type: ${PRESET_NAMES.join(", ")}`)
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
        preset?: string;
        key?: string;
        pubkey?: string;
        github?: boolean;
        json?: boolean;
      }) => {
        if (opts.json) setJsonMode(true);

        // Resolve preset
        const preset = opts.preset !== undefined ? (opts.preset as Preset) : undefined;
        if (preset !== undefined && !PRESET_NAMES.includes(preset)) {
          printError(`Unknown preset "${preset}". Available: ${PRESET_NAMES.join(", ")}`);
          process.exit(1);
        }
        const presetConfig = preset !== undefined ? PRESETS[preset] : undefined;
        const resolvedPurpose = presetConfig?.purpose ?? opts.purpose;

        const chainsDir = resolve(opts.dir);

        // Create chains directory
        await mkdir(chainsDir, { recursive: true });
        if (!opts.json) printHuman("chains dir", opts.dir);

        // Write local config
        await writeConfig({ connector: "fs", chainIds: [] });
        if (!opts.json) printHuman("config", ".glorychain/config.json");

        // Write CHAIN_CHARTER.md — preset content or generic template
        const charterPath = join(process.cwd(), "CHAIN_CHARTER.md");
        const charterContent =
          presetConfig?.charter ??
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
          ].join("\n");

        try {
          await writeFile(charterPath, charterContent, { flag: "wx" });
          if (!opts.json) printHuman("created", "CHAIN_CHARTER.md");
        } catch {
          // Already exists — skip silently
        }

        if (preset !== undefined && !opts.json) {
          printHuman("preset", preset);
          if (presetConfig?.hint) printHuman("structure", presetConfig.hint);
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
              purpose: resolvedPurpose,
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
