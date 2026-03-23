# Writing a Connector

A connector is a persistence backend for glorychain. The protocol ships with `@glorychain/fs` (filesystem) and `@glorychain/github` (GitHub repository). You can write your own for any storage target.

---

## The Connector interface

```ts
import type { Chain } from "@glorychain/core"

interface Connector {
  read(chainId: string): Promise<Chain>
  write(chain: Chain): Promise<void>
  list(): Promise<string[]>
}
```

That's it. Three methods.

---

## Reference: FsConnector

`@glorychain/fs` stores each chain as a JSON file at `{dir}/{chainId}.json`.

```ts
import { FsConnector } from "@glorychain/fs"

const connector = new FsConnector("./chains")

// Write a chain
await connector.write(chain)

// Read a chain by ID
const chain = await connector.read("550e8400-...")

// List all chain IDs
const ids = await connector.list()
```

---

## Example: S3Connector (sketch)

```ts
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import type { Chain } from "@glorychain/core"

export class S3Connector {
  private client: S3Client
  private bucket: string

  constructor(bucket: string, region = "us-east-1") {
    this.client = new S3Client({ region })
    this.bucket = bucket
  }

  async read(chainId: string): Promise<Chain> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: `chains/${chainId}.json` }),
    )
    const body = await res.Body?.transformToString()
    if (!body) throw new Error(`Chain not found: ${chainId}`)
    return JSON.parse(body) as Chain
  }

  async write(chain: Chain): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: `chains/${chain.metadata.chainId}.json`,
        Body: JSON.stringify(chain, null, 2),
        ContentType: "application/json",
      }),
    )
  }

  async list(): Promise<string[]> {
    // ListObjectsV2 implementation omitted for brevity
    return []
  }
}
```

---

## Chain JSON shape

Connectors store and retrieve the `Chain` type:

```ts
type Chain = {
  metadata: {
    chainId: string
    purpose: string
    creatorId: string
    identityType: string
    createdAt: string
    protocolVersion: string
    schema?: object
  }
  blocks: Block[]
}

type Block = {
  blockNumber: number
  chainId: string
  content: string
  timestamp: string
  previousHash: string
  publicKey: string
  signature: string
  protocolVersion: string
}
```

Connectors should store the full `Chain` object as-is and return it without modification. Verification is the protocol's responsibility, not the connector's.

---

## Using your connector with the core API

```ts
import { appendBlock, createChain, verifyChain } from "@glorychain/core"
import { S3Connector } from "./s3-connector"

const connector = new S3Connector("my-chain-bucket")

// Create
const result = createChain({ content: "Genesis", purpose: "audit", ... }, privateKey)
if (result.ok) await connector.write(result.value)

// Append
const chain = await connector.read(chainId)
const appended = appendBlock(chain, { content: "New record", publicKey }, privateKey)
if (appended.ok) await connector.write(appended.value)

// Verify
const chain = await connector.read(chainId)
const verification = await verifyChain(chain)
```
