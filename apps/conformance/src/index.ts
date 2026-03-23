import { Command } from "commander";
import { runSuites } from "./runner.js";
import { allSuites } from "./suites/index.js";

const program = new Command();

program
  .name("glorychain-conformance")
  .description("Glory Chain protocol conformance test suite")
  .version("0.0.1");

program
  .command("run")
  .description("Run all conformance suites")
  .option("--json", "Output results as JSON instead of TAP")
  .action(async (opts: { json?: boolean }) => {
    await runSuites(allSuites, { ...(opts.json !== undefined && { json: opts.json }) });
  });

program.parse();
