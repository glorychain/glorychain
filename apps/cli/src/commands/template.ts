import { writeFile } from "node:fs/promises";
import { Command } from "commander";
import { printError, printJson, setJsonMode } from "../utils/output.js";

function blockStub(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `# Block — ${date}

## Summary

<!-- Describe what this block records. -->

## References

<!-- Links to issues, PRs, documents, or ADRs related to this block. -->

<!-- Tip: check CHAIN_CHARTER.md for the required content format for this chain. -->
<!-- Tip: use --out to save to a file, then pass the contents with --content "$(cat file)" -->
`;
}

function adrStub(title: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `# ADR: ${title}

Date: ${date}

## Status

Proposed

## Context

<!-- What is the situation or problem that motivates this decision? -->

## Decision

<!-- What was decided? -->

## Consequences

<!-- What becomes easier or harder as a result of this decision? -->

## Chain Reference

<!-- Fill in after appending to chain: -->
Block appended to chain: <chain-id>, block number: <n>
`;
}

export function makeTemplateCommand(): Command {
  return new Command("template")
    .description("Generate a block or ADR content stub")
    .requiredOption("--type <type>", "Template type: block or adr")
    .option("--title <title>", "ADR title (required for --type adr)")
    .option("--out <file>", "Write output to file instead of stdout")
    .option("--json", "Output as JSON")
    .action(async (opts: { type: string; title?: string; out?: string; json?: boolean }) => {
      if (opts.json) setJsonMode(true);

      const validTypes = ["block", "adr"];
      if (!validTypes.includes(opts.type)) {
        printError(`--type must be one of: ${validTypes.join(", ")}`);
        process.exit(1);
      }

      if (opts.type === "adr" && !opts.title) {
        printError("--title is required for ADR templates");
        process.exit(1);
      }

      const content = opts.type === "block" ? blockStub() : adrStub(opts.title as string);

      if (opts.out) {
        await writeFile(opts.out, content, "utf8");
        if (!opts.json) {
          process.stdout.write(`written: ${opts.out}\n`);
        }
      } else if (opts.json) {
        printJson({ type: opts.type, content });
      } else {
        process.stdout.write(content);
      }
    });
}
