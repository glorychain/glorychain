# glorychain Protocol Specification

Version: `0.0.1` (protocol version field: `"0.0.1"`)

---

## Overview

A glorychain is an ordered sequence of cryptographically signed, hash-linked blocks. Any modification to any block breaks the chain's integrity in a way that is mathematically detectable by anyone with a copy of the chain.

---

## Block structure

Every block in a chain contains the following fields:

| Field | Type | Description |
|---|---|---|
| `blockNumber` | `number` | Sequential block index, starting at `0` |
| `chainId` | `string` | UUID identifying the chain |
| `content` | `string` | The record content (free text or JSON) |
| `timestamp` | `string` | ISO 8601 UTC timestamp |
| `previousHash` | `string \| null` | SHA-256 hash of the previous block's canonical payload (`null` for genesis) |
| `publicKey` | `string` | base64url-encoded Ed25519 public key of the signer |
| `signature` | `string` | base64url-encoded Ed25519 signature over the canonical payload |
| `protocolVersion` | `string` | Protocol version string (current: `"0.0.1"`) |

### Genesis block (block 0)

The genesis block extends the standard block with additional top-level fields. `previousHash` is `null`.

| Field | Type | Description |
|---|---|---|
| `creatorId` | `string` | Creator identifier |
| `purpose` | `string` | Free-text description of chain purpose |
| `identityType` | `string` | Identity scheme: `"oauth"` \| `"external"` \| `"anonymous"` |
| `hashAlgorithm` | `string` | Hash algorithm for the chain (default: `"sha256"`) |
| `signatureScheme` | `string` | Signature scheme for the chain (default: `"ed25519"`) |
| `contentSchema` | `object?` | Optional JSON Schema v7 — all subsequent blocks' `content` must conform |

---

## Canonical payload

The canonical payload is the deterministic JSON string that is hashed and signed. Fields are serialised in this exact key order using `JSON.stringify`:

**Standard blocks (block ≥ 1):**
```json
{
  "blockNumber": 1,
  "chainId": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Board approved X",
  "timestamp": "2026-03-23T10:00:00.000Z",
  "previousHash": "abc123...",
  "protocolVersion": "0.0.1"
}
```

**Genesis block (block 0)** additionally includes chain-level fields:
```json
{
  "blockNumber": 0,
  "chainId": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Genesis content",
  "timestamp": "2026-03-23T10:00:00.000Z",
  "previousHash": null,
  "protocolVersion": "0.0.1",
  "creatorId": "alice@example.com",
  "purpose": "audit-log",
  "identityType": "anonymous",
  "hashAlgorithm": "sha256",
  "signatureScheme": "ed25519",
  "contentSchema": null
}
```

The canonical payload is encoded as UTF-8 before hashing and signing. The `publicKey` is stored on the block but is **not** part of the canonical payload.

---

## Hashing

Each block's hash is the SHA-256 digest of its canonical payload, encoded as a lowercase hex string.

The genesis block's `previousHash` is `null`.

---

## Signing

Each block is signed using **Ed25519** over its canonical payload (UTF-8 encoded). The signature is base64url-encoded.

---

## Verification rules

A chain is valid if and only if all of the following hold:

1. **No duplicate block numbers** — every `blockNumber` in the chain is unique
2. **Sequential blocks** — block numbers form a contiguous sequence starting at `0`
3. **Hash continuity** — each block's `previousHash` equals the SHA-256 hash of the preceding block's canonical payload
4. **Valid signatures** — every block's `signature` verifies against its canonical payload using its `publicKey`
5. **No future timestamps** — no block's `timestamp` is in the future (with a small tolerance for clock skew)
6. **Schema conformance** — if the genesis block defines a `contentSchema`, all subsequent blocks' `content` must be valid JSON conforming to that schema

---

## Fork model

A chain can be forked when a key is compromised or a governance change occurs. A fork creates a new chain whose genesis block carries:

| Field | Type | Description |
|---|---|---|
| `forkOf` | `string` | `chainId` of the source chain |
| `forkFromBlock` | `number` | Block number in the source chain at which the fork branches |
| `forkSourceBlockHash` | `string` | Hash of the source block — ties the fork to a specific state |
| `forkReason` | `string?` | Optional human-readable reason for the fork |

A fork is a new chain with its own `chainId` and full verification guarantees. It is not a branch — the original chain is unmodified.

---

## Protocol versioning

The `protocolVersion` field is `"0.0.1"` for all blocks in this version of the spec. Future versions will increment this value. Verifiers must reject blocks with unknown protocol versions.
