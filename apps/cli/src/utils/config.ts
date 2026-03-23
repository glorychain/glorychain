import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface GloryChainConfig {
  connector: string;
  chainIds: string[];
}

const CONFIG_DIR = ".glorychain";
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
