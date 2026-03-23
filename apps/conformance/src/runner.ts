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
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
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
