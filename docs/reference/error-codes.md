# Error codes

All error codes produced by `verifyChain` and `verifySingleBlock`.

---

## Verification errors

These appear in `VerificationResult.errors` when a chain fails verification.

| Code | Meaning |
|---|---|
| `INVALID_HASH` | A block's hash does not match the SHA-256 of its canonical payload. The block's content, timestamp, or other fields have been modified. |
| `INVALID_SIGNATURE` | A block's signature does not verify against its canonical payload using its public key. The block has been tampered with, or the signature is malformed. |
| `BROKEN_CHAIN` | A block's `previousHash` does not match the hash of the preceding block. The chain has been broken — a block was inserted, deleted, or reordered. |
| `DUPLICATE_BLOCK` | Two or more blocks share the same `blockNumber`. The chain is malformed. |
| `MISSING_BLOCK` | Block numbers are not contiguous. One or more blocks have been removed. |
| `FUTURE_TIMESTAMP` | A block's `timestamp` is in the future (beyond the allowed clock skew tolerance). |
| `SCHEMA_VIOLATION` | A block's `content` does not conform to the JSON Schema defined in the genesis block's `metadata.schema`. Check `error.schemaErrors` for detail. |
| `INVALID_GENESIS` | The genesis block (block 0) is malformed or missing required metadata fields. |
| `UNKNOWN_PROTOCOL_VERSION` | A block's `protocolVersion` is not recognised by this implementation. |

---

## CLI errors

Errors produced by CLI commands.

| Message | Cause |
|---|---|
| `Chain not found: <id>` | No chain file exists at the expected path for the given chain ID. |
| `Invalid private key` | The `--key` value is not a valid base64url-encoded Ed25519 private key. |
| `Invalid public key` | The `--pubkey` value is not a valid base64url-encoded Ed25519 public key. |
| `Chain ID mismatch` | The chain file's internal `chainId` does not match the filename. The file may have been moved or renamed. |

---

## Result type

All fallible operations return:

```ts
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }
```

Check `result.ok` before accessing `result.value`.

---

## VerificationError shape

```ts
interface VerificationError {
  code: string          // one of the codes above
  blockNumber: number   // which block triggered the error
  message: string       // human-readable description
  schemaErrors?: Array<{ path: string; message: string }> // SCHEMA_VIOLATION only
}
```
