# Story 4.3 — Utility Commands: keygen, inspect, export

**Story ID:** 4.3
**Story Key:** `4-3-utility-commands-keygen-inspect-export`
**Epic:** 4 — CLI
**Status:** ready-for-dev
**Created:** 2026-03-22

---

## Story

As a developer using Glory Chain, I want `keygen`, `inspect`, and `export` CLI commands so that I can generate keypairs with mandatory custody warnings, inspect raw block structure, and export chains as portable offline-verifiable archives.

---

## Acceptance Criteria

### AC-1: keygen command
`glory-chain keygen [--json]`
Displays `CUSTODY_WARNING` to stderr before any key output. Outputs publicKey and privateKey (base64url). FR7, NFR9.

### AC-2: inspect command
`glory-chain inspect --chain <chainId> --block <n> [--dir <dir>] [--json]`
Reads and prints the raw block structure at index N. FR13.

### AC-3: export command
`glory-chain export --chain <chainId> [--dir <dir>] [--out <file>] [--json]`
Exports chain as a self-contained JSON archive. The archive format is: `{ exportedAt, chain }` — portable and offline-verifiable (contains full chain JSON + can be verified with `verifyChain` from core). FR33, FR48, FR49.

### AC-4: Full pipeline passes

---

## Tasks

### Task 1: Create src/commands/keygen.ts
### Task 2: Create src/commands/inspect.ts
### Task 3: Create src/commands/export.ts
### Task 4: Register in src/index.ts
### Task 5: Run full pipeline

---

## Complete Implementation

### apps/cli/src/commands/keygen.ts

```typescript
import { CUSTODY_WARNING, generateKeypair } from "@glory-chain/core";
import { Command } from "commander";
import { printHuman, printJson, isJsonMode, setJsonMode } from "../utils/output.js";

export function makeKeygenCommand(): Command {
  return new Command("keygen")
    .description("Generate a new Ed25519 keypair")
    .option("--json", "Output as JSON")
    .action((opts: { json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      // FR7/NFR9: Mandatory custody warning before any key output
      process.stderr.write(CUSTODY_WARNING + "\n");
      const result = generateKeypair();
      if (!result.ok) {
        process.stderr.write(`Error: ${result.error.message}\n`);
        process.exit(1);
      }
      if (isJsonMode()) {
        printJson({ publicKey: result.value.publicKey, privateKey: result.value.privateKey });
      } else {
        printHuman("publicKey", result.value.publicKey);
        printHuman("privateKey", result.value.privateKey);
      }
    });
}
```

### apps/cli/src/commands/inspect.ts

```typescript
import { inspectBlock } from "@glory-chain/core";
import { FsConnector } from "@glory-chain/fs";
import { Command } from "commander";
import { printError, printJson, printHuman, isJsonMode, setJsonMode } from "../utils/output.js";

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
```

### apps/cli/src/commands/export.ts

```typescript
import { writeFile } from "node:fs/promises";
import { FsConnector } from "@glory-chain/fs";
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
      const archive = JSON.stringify(
        { exportedAt: new Date().toISOString(), chain },
        null,
        2,
      );
      if (opts.out) {
        await writeFile(opts.out, archive, "utf8");
        printHuman("exported", opts.out);
      } else {
        process.stdout.write(`${archive}\n`);
      }
    });
}
```

### apps/cli/src/index.ts (updated to add keygen, inspect, export)

Add:
```typescript
import { makeKeygenCommand } from "./commands/keygen.js";
import { makeInspectCommand } from "./commands/inspect.js";
import { makeExportCommand } from "./commands/export.js";
...
program.addCommand(makeKeygenCommand());
program.addCommand(makeInspectCommand());
program.addCommand(makeExportCommand());
```

---

## Traceability

| AC | Requirement |
|----|-------------|
| keygen + custody warning | FR7, NFR9 |
| inspect | FR13 |
| export archive | FR33, FR48, FR49 |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### File List
- `apps/cli/src/index.ts` (updated)
- `apps/cli/src/commands/keygen.ts`
- `apps/cli/src/commands/inspect.ts`
- `apps/cli/src/commands/export.ts`
