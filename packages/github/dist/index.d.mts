import { Chain, Connector, ThreatEvent, VerificationResult } from "@glorychain/core";

//#region src/connector.d.ts
interface GitHubConnectorConfig {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
  dir?: string;
  pollIntervalMs?: number;
}
declare class GitHubConnector implements Connector {
  private readonly config;
  readonly version = "0.0.1";
  private readonly branch;
  private readonly dir;
  constructor(config: GitHubConnectorConfig);
  private filePath;
  private apiBase;
  private headers;
  read(chainId: string): Promise<Chain>;
  write(chain: Chain): Promise<void>;
  watch(chainId: string): AsyncIterable<ThreatEvent>;
  migrate(chainId: string, target: Connector): Promise<void>;
  verify(chainId: string): Promise<VerificationResult>;
}
//#endregion
//#region src/pages.d.ts
declare function getPagesUrl(config: GitHubConnectorConfig, chainId: string): string;
//#endregion
//#region src/scaffold.d.ts
interface ScaffoldOptions {
  branch?: string;
  dir?: string;
}
interface ScaffoldResult {
  action: "created" | "skipped" | "error";
  path: string;
  error?: string;
}
declare function scaffoldRepo(config: GitHubConnectorConfig, options?: ScaffoldOptions): Promise<ScaffoldResult[]>;
//#endregion
export { GitHubConnector, type GitHubConnectorConfig, type ScaffoldOptions, type ScaffoldResult, getPagesUrl, scaffoldRepo };
//# sourceMappingURL=index.d.mts.map