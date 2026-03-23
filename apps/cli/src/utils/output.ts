let jsonMode = false;

export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
}

export function isJsonMode(): boolean {
  return jsonMode;
}

// ANSI helpers — disabled when not a TTY so pipes stay clean
const isTTY = process.stdout.isTTY;
const c = {
  reset: isTTY ? "\x1b[0m" : "",
  bold: isTTY ? "\x1b[1m" : "",
  dim: isTTY ? "\x1b[2m" : "",
  green: isTTY ? "\x1b[32m" : "",
  cyan: isTTY ? "\x1b[36m" : "",
  yellow: isTTY ? "\x1b[33m" : "",
  red: isTTY ? "\x1b[31m" : "",
  magenta: isTTY ? "\x1b[35m" : "",
  gray: isTTY ? "\x1b[90m" : "",
};

export function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

/** Key: value line, e.g. "  chainId  abc123" */
export function printHuman(label: string, value: string): void {
  if (jsonMode) {
    printJson({ [label]: value });
    return;
  }
  const pad = 14;
  const key = `${c.gray}${label.padEnd(pad)}${c.reset}`;
  process.stdout.write(`  ${key}${c.cyan}${value}${c.reset}\n`);
}

/** ✔ success banner */
export function printSuccess(message: string): void {
  if (jsonMode) return;
  process.stdout.write(`\n${c.green}${c.bold}✔${c.reset}  ${c.bold}${message}${c.reset}\n\n`);
}

/** ✘ error banner (stderr) */
export function printError(message: string): void {
  const prefix = `${c.red}${c.bold}✘${c.reset}  `;
  process.stderr.write(`${prefix}${message}\n`);
}

/** ℹ info line (stdout) */
export function printInfo(message: string): void {
  if (jsonMode) return;
  process.stdout.write(`${c.dim}${message}${c.reset}\n`);
}

/** Dimmed section header */
export function printSection(title: string): void {
  if (jsonMode) return;
  process.stdout.write(`\n${c.bold}${c.magenta}${title}${c.reset}\n`);
}

/** Bullet list item */
export function printStep(message: string): void {
  if (jsonMode) return;
  process.stdout.write(`  ${c.gray}›${c.reset}  ${message}\n`);
}
