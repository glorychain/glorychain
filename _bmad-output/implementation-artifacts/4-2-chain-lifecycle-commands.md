# Story 4.2 — Chain Lifecycle Commands

**Story ID:** 4.2
**Story Key:** `4-2-chain-lifecycle-commands`
**Epic:** 4 — CLI
**Status:** ready-for-dev
**Created:** 2026-03-22

---

## Story

As a developer using Glory Chain, I want CLI commands for `create`, `append`, `verify`, `fork`, `migrate`, and `feed` so that I can manage chains from the command line without writing code.

---

## Background and Context

Story 4.1 scaffolded the CLI. This story wires up the six chain lifecycle commands — all thin wrappers delegating to `@glory-chain/core` and `@glory-chain/fs`.

Each command:
- Reads the active connector and chain dir from config (`.glory-chain/config.json`) or flags
- Delegates all logic to core + connector
- Uses `output.ts` utilities for stdout

---

## Acceptance Criteria

### AC-1: create command
`glory-chain create --key <privateKey> --content <text> [--purpose <p>] [--creator <id>] [--dir <dir>]`
Creates chain, writes to dir, prints chainId.

### AC-2: append command
`glory-chain append --chain <chainId> --key <privateKey> --content <text> [--dir <dir>]`
Reads chain, appends block, writes updated chain, prints blockNumber.

### AC-3: verify command
`glory-chain verify --chain <chainId> [--dir <dir>]`
Prints valid/invalid + error list.

### AC-4: fork command
`glory-chain fork --chain <chainId> --block <n> --key <privateKey> --content <text> [--dir <dir>]`
Forks from block N, writes forked chain, prints new chainId.

### AC-5: migrate command
`glory-chain migrate --chain <chainId> --from <srcDir> --to <destDir>`
Migrates chain from source to target FsConnector.

### AC-6: feed command
`glory-chain feed --chain <chainId> [--dir <dir>]`
Prints Atom 1.0 XML to stdout.

### AC-7: --json flag on all commands
All commands support `--json` for machine-readable output.

### AC-8: Full pipeline passes

---

## Tasks

### Task 1: Create src/commands/ directory with create, append, verify, fork, migrate, feed
### Task 2: Register commands in src/index.ts
### Task 3: Run full pipeline

---

## Dev Notes

All commands use `FsConnector` only (GitHub connector comes in Epic 5). The `--dir` flag defaults to `./chains`. Private keys are passed as base64url strings via `--key`.

The `generateKeypair` function is in `@glory-chain/core` — for the `keygen` command (Story 4.3). This story only uses keys passed as arguments.

### Command structure pattern

```typescript
import { Command } from "commander";
import { FsConnector } from "@glory-chain/fs";
import { createChain } from "@glory-chain/core";
import { printJson, printHuman, printError, setJsonMode } from "../utils/output.js";

export function makeCreateCommand(): Command {
  return new Command("create")
    .description("Create a new chain")
    .requiredOption("--key <privateKey>", "Ed25519 private key (base64url)")
    .requiredOption("--content <text>", "Genesis block content")
    .option("--purpose <purpose>", "Chain purpose", "general")
    .option("--creator <creatorId>", "Creator ID", "anonymous")
    .option("--pubkey <publicKey>", "Ed25519 public key (base64url)")
    .option("--dir <dir>", "Chain storage directory", "./chains")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      if (opts.json) setJsonMode(true);
      const connector = new FsConnector(opts.dir);
      const result = createChain(
        {
          content: opts.content,
          purpose: opts.purpose,
          creatorId: opts.creator,
          identityType: "anonymous",
          publicKey: opts.pubkey ?? "",
        },
        opts.key,
      );
      if (!result.ok) {
        printError(result.error.message);
        process.exit(1);
      }
      await connector.write(result.value);
      printHuman("chainId", result.value.metadata.chainId);
    });
}
```

---

## Complete Implementation

### apps/cli/src/commands/create.ts

```typescript
import { createChain } from "@glory-chain/core";
import { FsConnector } from "@glory-chain/fs";
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
    .action(async (opts: {
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
    });
}
```

### apps/cli/src/commands/append.ts

```typescript
import { appendBlock } from "@glory-chain/core";
import { FsConnector } from "@glory-chain/fs";
import { Command } from "commander";
import { printError, printHuman, setJsonMode } from "../utils/output.js";

export function makeAppendCommand(): Command {
  return new Command("append")
    .description("Append a block to an existing chain")
    .requiredOption("--chain <chainId>", "Chain ID")
    .requiredOption("--key <privateKey>", "Ed25519 private key (base64url)")
    .requiredOption("--pubkey <publicKey>", "Ed25519 public key (base64url)")
    .requiredOption("--content <text>", "Block content")
    .option("--dir <dir>", "Chain storage directory", "./chains")
    .option("--json", "Output as JSON")
    .action(async (opts: {
      chain: string;
      key: string;
      pubkey: string;
      content: string;
      dir: string;
      json?: boolean;
    }) => {
      if (opts.json) setJsonMode(true);
      const connector = new FsConnector(opts.dir);
      const chain = await connector.read(opts.chain).catch((err: unknown) => {
        printError(String(err));
        process.exit(1);
      });
      const result = appendBlock(chain, { content: opts.content, publicKey: opts.pubkey }, opts.key);
      if (!result.ok) {
        printError(result.error.message);
        process.exit(1);
      }
      await connector.write(result.value);
      const blockNumber = result.value.blocks.length - 1;
      printHuman("blockNumber", String(blockNumber));
    });
}
```

### apps/cli/src/commands/verify.ts

```typescript
import { FsConnector } from "@glory-chain/fs";
import { Command } from "commander";
import { printError, printJson, printHuman, setJsonMode, isJsonMode } from "../utils/output.js";

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
      } else {
        printHuman("valid", String(result.valid));
        if (result.errors.length > 0) {
          for (const e of result.errors) {
            printError(e.message);
          }
        }
      }
      if (!result.valid) process.exit(1);
    });
}
```

### apps/cli/src/commands/fork.ts

```typescript
import { forkChain } from "@glory-chain/core";
import { FsConnector } from "@glory-chain/fs";
import { Command } from "commander";
import { printError, printHuman, setJsonMode } from "../utils/output.js";

export function makeForkCommand(): Command {
  return new Command("fork")
    .description("Fork a chain from a specific block")
    .requiredOption("--chain <chainId>", "Source chain ID")
    .requiredOption("--block <n>", "Block number to fork from")
    .requiredOption("--key <privateKey>", "Ed25519 private key (base64url)")
    .requiredOption("--pubkey <publicKey>", "Ed25519 public key (base64url)")
    .requiredOption("--content <text>", "Fork genesis block content")
    .option("--dir <dir>", "Chain storage directory", "./chains")
    .option("--json", "Output as JSON")
    .action(async (opts: {
      chain: string;
      block: string;
      key: string;
      pubkey: string;
      content: string;
      dir: string;
      json?: boolean;
    }) => {
      if (opts.json) setJsonMode(true);
      const connector = new FsConnector(opts.dir);
      const source = await connector.read(opts.chain).catch((err: unknown) => {
        printError(String(err));
        process.exit(1);
      });
      const blockNumber = Number.parseInt(opts.block, 10);
      const result = forkChain(
        source,
        blockNumber,
        { content: opts.content, purpose: "fork", creatorId: "anonymous", identityType: "anonymous", publicKey: opts.pubkey },
        opts.key,
      );
      if (!result.ok) {
        printError(result.error.message);
        process.exit(1);
      }
      await connector.write(result.value.forkedChain);
      printHuman("chainId", result.value.forkedChain.metadata.chainId);
    });
}
```

### apps/cli/src/commands/migrate.ts

```typescript
import { FsConnector } from "@glory-chain/fs";
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
```

### apps/cli/src/commands/feed.ts

```typescript
import { generateFeed } from "@glory-chain/core";
import { FsConnector } from "@glory-chain/fs";
import { Command } from "commander";
import { printError, setJsonMode } from "../utils/output.js";

export function makeFeedCommand(): Command {
  return new Command("feed")
    .description("Generate Atom 1.0 RSS feed for a chain")
    .requiredOption("--chain <chainId>", "Chain ID")
    .option("--dir <dir>", "Chain storage directory", "./chains")
    .option("--base-url <url>", "Base URL for feed links", "https://glory-chain.dev")
    .option("--json", "Output as JSON")
    .action(async (opts: { chain: string; dir: string; baseUrl: string; json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      const connector = new FsConnector(opts.dir);
      const chain = await connector.read(opts.chain).catch((err: unknown) => {
        printError(String(err));
        process.exit(1);
      });
      const xml = generateFeed(chain, { baseUrl: opts.baseUrl });
      process.stdout.write(xml + "\n");
    });
}
```

### apps/cli/src/index.ts (updated)

```typescript
import { Command } from "commander";
import { makeAppendCommand } from "./commands/append.js";
import { makeCreateCommand } from "./commands/create.js";
import { makeFeedCommand } from "./commands/feed.js";
import { makeForkCommand } from "./commands/fork.js";
import { makeMigrateCommand } from "./commands/migrate.js";
import { makeVerifyCommand } from "./commands/verify.js";

const program = new Command();

program
  .name("glory-chain")
  .description("Create, verify, and manage Glory Chain audit chains")
  .version("0.0.1");

program.addCommand(makeCreateCommand());
program.addCommand(makeAppendCommand());
program.addCommand(makeVerifyCommand());
program.addCommand(makeForkCommand());
program.addCommand(makeMigrateCommand());
program.addCommand(makeFeedCommand());

program.parse();
```

---

## Traceability

| AC | Requirement |
|----|-------------|
| create | FR27 |
| append | FR28 |
| verify | FR29 |
| fork | FR30 |
| migrate | FR31 |
| feed | FR32 |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### File List
- `apps/cli/src/index.ts` (updated)
- `apps/cli/src/commands/create.ts`
- `apps/cli/src/commands/append.ts`
- `apps/cli/src/commands/verify.ts`
- `apps/cli/src/commands/fork.ts`
- `apps/cli/src/commands/migrate.ts`
- `apps/cli/src/commands/feed.ts`
