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
