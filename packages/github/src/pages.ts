import type { GitHubConnectorConfig } from "./connector.js";

export function getPagesUrl(config: GitHubConnectorConfig, chainId: string): string {
  const dir = config.dir ?? "chains";
  return `https://${config.owner}.github.io/${config.repo}/${dir}/${chainId}.json`;
}
