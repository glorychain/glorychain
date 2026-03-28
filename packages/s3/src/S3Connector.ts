import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Chain, Connector, ThreatEvent, VerificationResult } from "@glorychain/core";
import { migrateChain, verifyChain } from "@glorychain/core";

export interface S3ConnectorConfig {
  /** S3 bucket name. */
  bucket: string;
  /** Key prefix for chain objects. Default: "chains" */
  prefix?: string;
  /** AWS region. Use "auto" for Cloudflare R2. Default: "us-east-1" */
  region?: string;
  /** Custom endpoint URL — required for R2, MinIO, Backblaze B2 */
  endpoint?: string;
  /** AWS credentials. Uses SDK credential chain if omitted. */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export class S3Connector implements Connector {
  readonly version = "0.0.1";

  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(config: S3ConnectorConfig) {
    this.bucket = config.bucket;
    this.prefix = config.prefix ?? "chains";
    this.client = new S3Client({
      region: config.region ?? "us-east-1",
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      ...(config.credentials ? { credentials: config.credentials } : {}),
      // Required for path-style URLs (MinIO, some R2 setups)
      forcePathStyle: config.endpoint !== undefined,
    });
  }

  private key(chainId: string): string {
    return `${this.prefix}/${chainId}.json`;
  }

  async read(chainId: string): Promise<Chain> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: this.key(chainId) }),
    );
    if (!response.Body) throw new Error(`Chain not found: ${chainId}`);
    const raw = await response.Body.transformToString("utf-8");
    return JSON.parse(raw) as Chain;
  }

  async write(chain: Chain): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.key(chain.metadata.chainId),
        Body: JSON.stringify(chain, null, 2),
        ContentType: "application/json",
      }),
    );
  }

  async exists(chainId: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.key(chainId) }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<string[]> {
    const chainIds: string[] = [];
    let continuationToken: string | undefined;
    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: `${this.prefix}/`,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of response.Contents ?? []) {
        if (!obj.Key) continue;
        const name = obj.Key.slice(`${this.prefix}/`.length);
        if (name.endsWith(".json")) chainIds.push(name.slice(0, -5));
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    return chainIds;
  }

  async delete(chainId: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: this.key(chainId) }),
    );
  }

  async migrate(chainId: string, target: Connector): Promise<void> {
    const chain = await this.read(chainId);
    const updated = migrateChain(chain, "s3", target.version);
    await target.write(updated);
  }

  async verify(chainId: string): Promise<VerificationResult> {
    const chain = await this.read(chainId);
    return verifyChain(chain);
  }

  // S3 connectors are not watchable — poll externally or use S3 event notifications
  watch(_chainId: string): AsyncIterable<ThreatEvent> {
    throw new Error(
      "S3Connector does not support watch(). Use S3 event notifications or poll verify() instead.",
    );
  }
}
