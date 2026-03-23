import { Chain, Connector, ThreatEvent, VerificationResult } from "@glorychain/core";

//#region src/connector.d.ts
interface FsConnectorOptions {
  pollIntervalMs?: number;
}
declare class FsConnector implements Connector {
  private readonly dir;
  readonly version = "0.0.1";
  private readonly pollIntervalMs;
  constructor(dir: string, options?: FsConnectorOptions);
  read(chainId: string): Promise<Chain>;
  write(chain: Chain): Promise<void>;
  watch(chainId: string): AsyncIterable<ThreatEvent>;
  migrate(chainId: string, target: Connector): Promise<void>;
  verify(chainId: string): Promise<VerificationResult>;
}
//#endregion
export { FsConnector };
//# sourceMappingURL=index.d.mts.map