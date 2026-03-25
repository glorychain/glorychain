# @glorychain/s3

> S3-compatible connector for glorychain. Store chains in AWS S3, Cloudflare R2, MinIO, or Backblaze B2.

```bash
npm install @glorychain/s3
# or
pnpm add @glorychain/s3
```

---

## Usage

```ts
import { appendBlock, createChain, generateKeypair } from "@glorychain/core"
import { S3Connector } from "@glorychain/s3"

const connector = new S3Connector({
  bucket: "my-chains-bucket",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const { value: { privateKey, publicKey } } = generateKeypair()

const { value: chain } = createChain({
  content: "Board resolution register.",
  purpose: "governance",
  creatorId: "secretary@acme.org",
  identityType: "anonymous",
  publicKey,
}, privateKey)

await connector.write(chain)

const read = await connector.read(chain.metadata.chainId)
const ids  = await connector.list()
```

---

## Cloudflare R2

```ts
const connector = new S3Connector({
  bucket: "my-chains",
  region: "auto",
  endpoint: "https://<account-id>.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})
```

## MinIO

```ts
const connector = new S3Connector({
  bucket: "chains",
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: "minioadmin",
    secretAccessKey: "minioadmin",
  },
})
```

---

## Config

| Option | Type | Default | Description |
|---|---|---|---|
| `bucket` | `string` | required | S3 bucket name |
| `prefix` | `string` | `"chains"` | Key prefix for all chain objects |
| `region` | `string` | `"us-east-1"` | AWS region. Use `"auto"` for R2 |
| `endpoint` | `string` | — | Custom endpoint for R2, MinIO, Backblaze |
| `credentials` | `{ accessKeyId, secretAccessKey }` | — | Explicit credentials. Omit to use environment/IAM |

---

## Storage layout

Each chain is stored as a single JSON object:

```
{prefix}/{chainId}.json
```

Writes are atomic (`PutObject`). No partial state is possible.

---

## API

| Method | Description |
|---|---|
| `read(chainId)` | Read a chain |
| `write(chain)` | Write (upsert) a chain |
| `exists(chainId)` | Check if a chain exists |
| `list()` | List all chain IDs in the bucket prefix |
| `delete(chainId)` | Delete a chain |
| `verify(chainId)` | Read and verify chain integrity |
| `migrate(chainId, target)` | Migrate a chain to another connector |

`watch()` is not supported — use S3 event notifications or poll `verify()` instead.
