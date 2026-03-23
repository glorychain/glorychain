# glorychain Protocol Specification

Version: `0.1` (protocol version field: `"0.1"`)

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
| `previousHash` | `string` | SHA-256 hash of the previous block's canonical payload (`"0"` for genesis) |
| `publicKey` | `string` | base64url-encoded Ed25519 public key of the signer |
| `signature` | `string` | base64url-encoded Ed25519 signature over the canonical payload |
| `protocolVersion` | `string` | Protocol version string (`"0.1"`) |

### Genesis block (block 0)

The genesis block additionally contains a `metadata` object:

| Field | Type | Description |
|---|---|---|
| `metadata.chainId` | `string` | Same as the block's `chainId` |
| `metadata.purpose` | `string` | Free-text description of chain purpose |
| `metadata.creatorId` | `string` | Creator identifier |
| `metadata.identityType` | `string` | Identity scheme (`"anonymous"` \| `"github"` \| `"did"`) |
| `metadata.createdAt` | `string` | ISO 8601 creation timestamp |
| `metadata.protocolVersion` | `string` | Protocol version |
| `metadata.schema` | `object?` | Optional JSON Schema v7 — all subsequent blocks must conform |

---

## Canonical payload

The canonical payload is the deterministic byte string that is hashed and signed. It is constructed by serialising the following fields in this exact order, separated by `\n`:

```
blockNumber
chainId
content
timestamp
previousHash
publicKey
protocolVersion
```

Example:
```
1
550e8400-e29b-41d4-a716-446655440000
Board approved X
2026-03-23T10:00:00.000Z
abc123...
base64urlpublickey...
0.1
```

The canonical payload is encoded as UTF-8 before hashing and signing.

---

## Hashing

Each block's hash is the SHA-256 digest of its canonical payload, encoded as a lowercase hex string.

The genesis block's `previousHash` is the string `"0"`.

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
6. **Schema conformance** — if the genesis block defines a `metadata.schema`, all subsequent blocks' `content` must be valid JSON conforming to that schema

---

## Fork model

A chain can be forked when a key is compromised or a governance change occurs. A fork creates a new chain whose genesis block carries:

| Field | Type | Description |
|---|---|---|
| `metadata.forkedFrom` | `string` | `chainId` of the original chain |
| `metadata.forkPoint` | `number` | Block number in the original chain at which the fork branches |
| `metadata.forkReason` | `string` | Human-readable reason for the fork |

A fork is a new chain with its own `chainId` and full verification guarantees. It is not a branch — the original chain is unmodified.

---

## Protocol versioning

The `protocolVersion` field is `"0.1"` for all blocks in this version of the spec. Future versions will increment this value. Verifiers must reject blocks with unknown protocol versions.
