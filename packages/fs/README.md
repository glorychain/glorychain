# @glorychain/fs

> File system connector for glorychain. Read, write, and watch chains stored as local JSON files.

```bash
npm install @glorychain/fs
# or
pnpm add @glorychain/fs
```

Use this connector when you want chains to live on disk — for local development, self-hosted deployments, or any scenario where files are your persistence layer.

---

## Quick start

```typescript
import { FsConnector } from "@glorychain/fs";

const connector = new FsConnector("./chains");

// Read a chain
const chain = await connector.read(chainId);

// Write (after appending a block via @glorychain/core)
await connector.write(updatedChain);
```

Each chain is a single JSON file at `{dir}/{chainId}.json`.

---

## Watching for changes

The `watch()` method returns an async iterable that yields events whenever the chain file changes on disk. Use it to build real-time pipelines, audit daemons, or CI integrations.

```typescript
for await (const event of connector.watch(chainId)) {
  if (event.type === "FILE_MODIFIED") {
    console.log(`Chain file changed: ${event.chainId}`);
  }
  if (event.type === "FILE_MISSING") {
    console.error("ALERT: chain file missing — possible deletion");
  }
  if (event.type === "UNEXPECTED_ERROR") {
    console.error("Watch error:", event.detail);
  }
}
```

The watcher runs integrity verification on every detected change. If the chain no longer verifies, it yields a threat event before your code processes the new state.

---

## Threat detection

The file system connector watches not just for new blocks, but for *anomalies* — signs that a chain may have been tampered with outside the protocol.

| Event type | What it means |
|------------|---------------|
| `FILE_MISSING` | The chain file was deleted or moved |
| `FILE_MODIFIED` | The chain file changed outside the protocol |
| `UNEXPECTED_ERROR` | An internal error occurred during the watch cycle |

In a tamper-evident system, threat events are as important as normal events. A `HASH_MISMATCH` on a chain that previously verified is evidence of modification.

---

## Configuration

```typescript
const connector = new FsConnector(
  "./chains",     // directory where chain JSON files live
  {
    pollIntervalMs: 2000,   // poll interval for watch() — default: 2000ms
  }
);
```

---

## File format

Each chain file is a single JSON document containing the full `Chain` object:

```json
{
  "metadata": {
    "chainId": "3e7c9f2a-...",
    "createdAt": "2026-03-22T10:00:00.000Z",
    "protocolVersion": "0.0.1",
    "hashAlgorithm": "sha256",
    "signatureScheme": "ed25519",
    "migrationHistory": [],
    "knownForks": [],
    "transferHistory": []
  },
  "blocks": [
    {
      "blockNumber": 0,
      "chainId": "3e7c9f2a-...",
      "content": "Genesis: track all board decisions publicly",
      "publicKey": "MCowBQYDK2V...",
      "signature": "base64url...",
      "previousHash": null,
      "hash": "sha256hex...",
      "timestamp": "2026-03-22T10:00:00.000Z",
      "protocolVersion": "0.0.1",
      "creatorId": "board.chair@acme.org",
      "purpose": "governance",
      "identityType": "anonymous",
      "hashAlgorithm": "sha256",
      "signatureScheme": "ed25519",
      "contentSchema": null
    }
  ]
}
```

The full protocol spec for the chain and block schema is in [`@glorychain/core`](../core/README.md).

---

## CLI shortcut

The glorychain CLI uses the file system connector by default:

```bash
glorychain create \
  --key $PRIVATE_KEY \
  --pubkey $PUBLIC_KEY \
  --content "My Chain" \
  --purpose "Track decisions"
glorychain verify --chain <chainId>
```

See [`apps/cli`](../../apps/cli/README.md) for full CLI documentation.
