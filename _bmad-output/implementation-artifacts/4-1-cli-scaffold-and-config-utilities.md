# Story 4.1 — CLI Scaffold and Config Utilities

**Story ID:** 4.1
**Story Key:** `4-1-cli-scaffold-and-config-utilities`
**Epic:** 4 — CLI
**Status:** ready-for-dev
**Created:** 2026-03-22

---

## Story

As a developer using Glory Chain, I want the `glory-chain` CLI app scaffolded with a commander.js root, output utilities, and a local `.glory-chain` config system, so that subsequent CLI command stories can build on a consistent foundation.

---

## Background and Context

`apps/cli` already exists as a stub with `package.json` and `tsconfig.json`. This story fills it in:
- Real build/test/typecheck scripts
- `src/index.ts` — commander.js program root
- `src/utils/output.ts` — consistent stdout: JSON mode (`--json`) + human-readable default
- `src/utils/config.ts` — read/write `.glory-chain` local config file (active connector, chain IDs)

No commands are implemented in this story — just the scaffold. Story 4.2 adds lifecycle commands.

---

## Acceptance Criteria

### AC-1: Real build scripts
`build`, `typecheck`, `lint`, `test` scripts work without the `|| true` stub.

### AC-2: src/index.ts wires commander
`glory-chain --version` outputs the version. `glory-chain --help` shows usage.

### AC-3: output.ts
Exports `printJson(data)` and `printHuman(label, value)`. When `--json` flag is active, all output is JSON.

### AC-4: config.ts
Exports `readConfig()` and `writeConfig(config)`. Config stored in `.glory-chain/config.json` in cwd. Type: `{ connector: string; chainIds: string[] }`.

### AC-5: Full pipeline passes

---

## Tasks

### Task 1: Update apps/cli/package.json — real scripts, add @types/node, tsdown config
### Task 2: Create apps/cli/tsdown.config.ts and vitest.config.ts
### Task 3: Create src/index.ts (commander root)
### Task 4: Create src/utils/output.ts
### Task 5: Create src/utils/config.ts
### Task 6: Create src/utils/output.test.ts and config.test.ts
### Task 7: Run full pipeline

---

## Complete Implementation

### apps/cli/package.json (updated)

```json
{
  "name": "glory-chain",
  "version": "0.0.1",
  "type": "module",
  "description": "Glory Chain CLI",
  "bin": {
    "glory-chain": "./dist/index.mjs"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsdown",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "test": "vitest run"
  },
  "dependencies": {
    "@glory-chain/core": "workspace:*",
    "@glory-chain/fs": "workspace:*",
    "commander": "^14.0.0"
  },
  "devDependencies": {
    "@biomejs/biome": "latest",
    "@types/node": "^22.0.0",
    "tsdown": "latest",
    "typescript": "^5.9.0",
    "vitest": "^4.1.0"
  },
  "engines": { "node": ">=20" }
}
```

### apps/cli/tsconfig.json (updated)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### apps/cli/tsdown.config.ts

```typescript
import { defineConfig } from "tsdown";
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  sourcemap: true,
  deps: { neverBundle: ["@glory-chain/core", "@glory-chain/fs"] },
});
```

### apps/cli/vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
});
```

### apps/cli/src/index.ts

```typescript
import { Command } from "commander";

const program = new Command();

program
  .name("glory-chain")
  .description("Create, verify, and manage Glory Chain audit chains")
  .version("0.0.1");

program.parse();
```

### apps/cli/src/utils/output.ts

```typescript
let jsonMode = false;

export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
}

export function isJsonMode(): boolean {
  return jsonMode;
}

export function printJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

export function printHuman(label: string, value: string): void {
  if (jsonMode) {
    printJson({ [label]: value });
  } else {
    process.stdout.write(`${label}: ${value}\n`);
  }
}

export function printError(message: string): void {
  process.stderr.write(`Error: ${message}\n`);
}
```

### apps/cli/src/utils/config.ts

```typescript
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface GloryChainConfig {
  connector: string;
  chainIds: string[];
}

const CONFIG_DIR = ".glory-chain";
const CONFIG_FILE = "config.json";

function configPath(cwd = process.cwd()): string {
  return join(cwd, CONFIG_DIR, CONFIG_FILE);
}

export async function readConfig(cwd?: string): Promise<GloryChainConfig | null> {
  try {
    const raw = await readFile(configPath(cwd), "utf8");
    return JSON.parse(raw) as GloryChainConfig;
  } catch {
    return null;
  }
}

export async function writeConfig(config: GloryChainConfig, cwd?: string): Promise<void> {
  const dir = join(cwd ?? process.cwd(), CONFIG_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(configPath(cwd), JSON.stringify(config, null, 2), "utf8");
}
```

### apps/cli/src/utils/output.test.ts

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isJsonMode, printHuman, printJson, setJsonMode } from "./output.js";

describe("output utilities", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    setJsonMode(false);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    setJsonMode(false);
  });

  it("printJson writes JSON to stdout", () => {
    printJson({ key: "value" });
    expect(stdoutSpy).toHaveBeenCalledWith('{\n  "key": "value"\n}\n');
  });

  it("printHuman writes label: value in human mode", () => {
    printHuman("status", "ok");
    expect(stdoutSpy).toHaveBeenCalledWith("status: ok\n");
  });

  it("printHuman writes JSON in json mode", () => {
    setJsonMode(true);
    expect(isJsonMode()).toBe(true);
    printHuman("status", "ok");
    expect(stdoutSpy).toHaveBeenCalledWith('{\n  "status": "ok"\n}\n');
  });
});
```

### apps/cli/src/utils/config.test.ts

```typescript
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readConfig, writeConfig } from "./config.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `glory-chain-config-${randomUUID()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("config utilities", () => {
  it("readConfig returns null when no config exists", async () => {
    const config = await readConfig(testDir);
    expect(config).toBeNull();
  });

  it("writeConfig + readConfig round-trip", async () => {
    const cfg = { connector: "fs", chainIds: ["chain-1", "chain-2"] };
    await writeConfig(cfg, testDir);
    const read = await readConfig(testDir);
    expect(read).toEqual(cfg);
  });

  it("writeConfig is idempotent", async () => {
    const cfg = { connector: "fs", chainIds: ["chain-1"] };
    await writeConfig(cfg, testDir);
    await writeConfig(cfg, testDir);
    const read = await readConfig(testDir);
    expect(read).toEqual(cfg);
  });
});
```

---

## Traceability

| AC | Requirement |
|----|-------------|
| CLI scaffold | FR27-FR33 foundation |
| config utilities | FR27-FR33 (connector selection) |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### File List
- `apps/cli/package.json` (updated)
- `apps/cli/tsconfig.json` (updated)
- `apps/cli/tsdown.config.ts`
- `apps/cli/vitest.config.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/utils/output.ts`
- `apps/cli/src/utils/config.ts`
- `apps/cli/src/utils/output.test.ts`
- `apps/cli/src/utils/config.test.ts`
