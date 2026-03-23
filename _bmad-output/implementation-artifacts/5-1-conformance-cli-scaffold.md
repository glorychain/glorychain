# Story 5.1 — Conformance CLI Scaffold

**Story ID:** 5.1
**Story Key:** `5-1-conformance-cli-scaffold`
**Epic:** 5 — Conformance CLI and GitHub Connector
**Status:** ready-for-dev
**Created:** 2026-03-22

---

## Story

As a third-party implementor of the Glory Chain protocol, I want a standalone `glory-chain-conformance` CLI that exercises my implementation against the spec, so that I can verify interoperability without depending on the Glory Chain reference codebase.

---

## Background and Context

The conformance CLI (`apps/conformance`) is a standalone spec test runner. It:
- Has zero Glory Chain infra dependency — only `commander` + Node built-ins
- Produces TAP-compatible output (Test Anything Protocol)
- Is runnable against any implementation via a `--impl` adapter flag
- FR21, NFR18, NFR19

Story 5.1 scaffolds the CLI and `runner.ts`. Story 5.2 adds the actual test suites.

For Story 5.1, the runner executes placeholder suites and outputs valid TAP.

---

## Acceptance Criteria

### AC-1: Real build scripts, no stubs
`build`, `typecheck`, `lint`, `test` all work without `|| true` stubs.

### AC-2: src/index.ts with commander
`glory-chain-conformance --version` and `--help` work.

### AC-3: runner.ts TAP output
`runner.ts` exports `runSuites(suites)` that accepts an array of named test suites and outputs TAP format to stdout. Each suite result: `ok N - <name>` or `not ok N - <name>`.

### AC-4: Full pipeline passes

---

## Complete Implementation

### apps/conformance/package.json (updated)

```json
{
  "name": "glory-chain-conformance",
  "version": "0.0.1",
  "type": "module",
  "description": "Glory Chain conformance test CLI",
  "bin": {
    "glory-chain-conformance": "./dist/index.mjs"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsdown",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "test": "vitest run"
  },
  "dependencies": {
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

### apps/conformance/tsconfig.json (updated)

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

### apps/conformance/src/index.ts

```typescript
import { Command } from "commander";
import { runSuites } from "./runner.js";
import { placeholderSuites } from "./suites/placeholder.js";

const program = new Command();

program
  .name("glory-chain-conformance")
  .description("Glory Chain protocol conformance test suite")
  .version("0.0.1");

program
  .command("run")
  .description("Run all conformance suites")
  .option("--json", "Output results as JSON instead of TAP")
  .action(async (opts: { json?: boolean }) => {
    await runSuites(placeholderSuites, { json: opts.json });
  });

program.parse();
```

### apps/conformance/src/runner.ts

```typescript
export interface Suite {
  name: string;
  run: () => Promise<SuiteResult>;
}

export interface SuiteResult {
  passed: boolean;
  name: string;
  error?: string;
}

export interface RunOptions {
  json?: boolean;
}

export async function runSuites(suites: Suite[], options: RunOptions = {}): Promise<void> {
  const results: SuiteResult[] = [];
  for (const suite of suites) {
    const result = await suite.run().catch((err: unknown) => ({
      passed: false,
      name: suite.name,
      error: String(err),
    }));
    results.push(result);
  }

  if (options.json) {
    process.stdout.write(JSON.stringify(results, null, 2) + "\n");
    return;
  }

  // TAP output
  process.stdout.write(`TAP version 14\n`);
  process.stdout.write(`1..${results.length}\n`);
  let i = 1;
  for (const r of results) {
    const status = r.passed ? "ok" : "not ok";
    process.stdout.write(`${status} ${i} - ${r.name}\n`);
    if (!r.passed && r.error) {
      process.stdout.write(`  # Error: ${r.error}\n`);
    }
    i++;
  }
  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) process.exit(1);
}
```

### apps/conformance/src/suites/placeholder.ts

```typescript
import type { Suite } from "../runner.js";

export const placeholderSuites: Suite[] = [
  {
    name: "placeholder — conformance suites added in Story 5.2",
    run: async () => ({ passed: true, name: "placeholder — conformance suites added in Story 5.2" }),
  },
];
```

### apps/conformance/src/runner.test.ts

```typescript
import { describe, expect, it, vi } from "vitest";
import type { Suite } from "./runner.js";
import { runSuites } from "./runner.js";

describe("runSuites", () => {
  it("outputs TAP for passing suites", async () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const suites: Suite[] = [
      { name: "suite one", run: async () => ({ passed: true, name: "suite one" }) },
    ];
    await runSuites(suites);
    const output = spy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("TAP version 14");
    expect(output).toContain("1..1");
    expect(output).toContain("ok 1 - suite one");
    spy.mockRestore();
  });

  it("marks failed suite as not ok", async () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const suites: Suite[] = [
      { name: "failing suite", run: async () => ({ passed: false, name: "failing suite", error: "oops" }) },
    ];
    await runSuites(suites);
    const output = spy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("not ok 1 - failing suite");
    expect(exitSpy).toHaveBeenCalledWith(1);
    spy.mockRestore();
    exitSpy.mockRestore();
  });

  it("outputs JSON when json option is set", async () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const suites: Suite[] = [
      { name: "json suite", run: async () => ({ passed: true, name: "json suite" }) },
    ];
    await runSuites(suites, { json: true });
    const output = spy.mock.calls.map((c) => c[0]).join("");
    const parsed = JSON.parse(output) as Array<{ name: string; passed: boolean }>;
    expect(parsed[0]?.name).toBe("json suite");
    spy.mockRestore();
  });
});
```

---

## Traceability

| AC | Requirement |
|----|-------------|
| TAP output | FR21, NFR19 |
| Zero Glory Chain deps | NFR18 |
| Standalone CLI | FR21 |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### File List
- `apps/conformance/package.json` (updated)
- `apps/conformance/tsconfig.json` (updated)
- `apps/conformance/tsdown.config.ts`
- `apps/conformance/vitest.config.ts`
- `apps/conformance/src/index.ts`
- `apps/conformance/src/runner.ts`
- `apps/conformance/src/runner.test.ts`
- `apps/conformance/src/suites/placeholder.ts`
