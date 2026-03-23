# Story 2.2 — Cryptographic Primitives

**Story ID:** 2.2
**Story Key:** `2-2-cryptographic-primitives`
**Epic:** 2 — Core Protocol Library
**Status:** done
**Created:** 2026-03-22

---

## Story

As a developer building on Glory Chain, I want a set of cryptographic primitive functions — hashing, signing, signature verification, and keypair generation — implemented in `packages/core/src/crypto/` with zero runtime dependencies and configurable algorithm support, so that the chain lifecycle functions in Story 2.3 can construct and verify blocks deterministically without pulling in any external packages.

---

## Background and Context

Story 2.1 delivered all TypeScript types. This story delivers the cryptographic foundations that every subsequent core story depends on.

The design mandate is strict:
- **Zero runtime dependencies** — all crypto uses Node.js built-in `node:crypto` module (available since Node 15, stable in Node 18 LTS which is the minimum engine). No `@noble/ed25519`, no `tweetnacl`, nothing external.
- **Configurable algorithms** — `hashAlgorithm` and `signatureScheme` are stored per-chain in `ChainMetadata` and per-block in `GenesisBlock`. The primitives must respect these values and return `Result<T, GloryChainError>` for unsupported algorithms.
- **Default algorithms** — SHA-256 for hashing, Ed25519 for signing.
- **Output encoding** — hashes as lowercase hex (64 chars for SHA-256), signatures and public keys as Base64url.
- **FR56** — signatures are deterministic; same inputs always produce same output.
- **NFR14** — zero runtime dependencies enforced.
- **NFR17** — bundle size ≤50KB; crypto module uses built-ins only.
- **FR7** — `keygen.ts` must display a mandatory custody warning before any key output.

Node.js `node:crypto` supports:
- `createHash('sha256')` — SHA-256 hashing
- `generateKeyPairSync('ed25519')` / `generateKeyPair('ed25519', ...)` — Ed25519 key generation
- `sign(undefined, data, privateKey)` / `verify(undefined, data, publicKey, signature)` — Ed25519 signing/verification (undefined algorithm = use key's native algorithm)
- Key export as DER/PEM/JWK — use `'raw'` format for compact 32-byte representation, Base64url-encoded for storage

---

## Acceptance Criteria

### AC-1: File Structure Created
All crypto files exist at correct paths:
- `packages/core/src/crypto/hash.ts`
- `packages/core/src/crypto/sign.ts`
- `packages/core/src/crypto/keygen.ts`
- `packages/core/src/crypto/index.ts`
- `packages/core/src/crypto/hash.test.ts`
- `packages/core/src/crypto/sign.test.ts`
- `packages/core/src/crypto/keygen.test.ts`

### AC-2: hash.ts — SHA-256 default, configurable
- `hashBlock(payload: string, algorithm?: string): Result<string, GloryChainError>`
- Default algorithm is `'sha256'`
- Returns lowercase hex string (64 chars for SHA-256)
- Returns `{ ok: false, error: { code: 'ALGORITHM_UNSUPPORTED', message: '...' } }` for unknown algorithms
- Deterministic: same input always produces same output

### AC-3: sign.ts — Ed25519 default, configurable
- `signBlock(payload: string, privateKeyBase64url: string, scheme?: string): Result<string, GloryChainError>`
- `verifyBlock(payload: string, signatureBase64url: string, publicKeyBase64url: string, scheme?: string): Result<boolean, GloryChainError>`
- Default scheme is `'ed25519'`
- Returns `{ ok: false, error: { code: 'ALGORITHM_UNSUPPORTED', message: '...' } }` for unsupported schemes
- `verifyBlock` returns `{ ok: true, value: false }` for invalid signature (not an error — a valid verification result)
- Signatures are Base64url-encoded

### AC-4: keygen.ts — keypair generation with custody warning
- `generateKeypair(scheme?: string): Result<{ publicKey: string; privateKey: string }, GloryChainError>`
- Returns keypair as Base64url-encoded strings
- Default scheme is `'ed25519'`
- Returns `ALGORITHM_UNSUPPORTED` error for unsupported schemes
- `CUSTODY_WARNING` constant exported: the mandatory warning string displayed before any key output (FR7)
- **Does NOT print or console.log the warning itself** — the warning string is exported for callers (CLI) to display. The function is pure — no side effects.

### AC-5: crypto/index.ts re-exports all primitives
All public functions and constants exported from `packages/core/src/crypto/index.ts`. The root `packages/core/src/index.ts` is updated to re-export from `./crypto/index.js`.

### AC-6: Zero Runtime Dependencies
Build output (`dist/index.mjs`) contains no external import statements. All crypto uses `node:crypto` built-in. `node:crypto` is a Node.js built-in — it does NOT appear as an external import in the bundle (tsdown treats `node:*` prefixed imports as externals automatically, which is correct).

### AC-7: TypeScript checks pass
`pnpm turbo typecheck --filter=@glory-chain/core` exits 0. No `any` types. `verbatimModuleSyntax` satisfied.

### AC-8: Tests pass
`pnpm turbo test --filter=@glory-chain/core` exits 0. All new tests pass alongside existing Story 2.1 tests (15 tests remain passing + new crypto tests).

### AC-9: Full pipeline passes
`pnpm turbo build test typecheck lint --filter=@glory-chain/core` exits 0.

---

## Tasks

### Task 1: Create packages/core/src/crypto/hash.ts
Implement `hashBlock` using `node:crypto` `createHash`. Support `'sha256'` (default). Return `ALGORITHM_UNSUPPORTED` for unknown algorithms.

### Task 2: Create packages/core/src/crypto/sign.ts
Implement `signBlock` and `verifyBlock` using `node:crypto` `sign`/`verify`. Support `'ed25519'` (default). Handle Base64url encoding/decoding of keys and signatures.

### Task 3: Create packages/core/src/crypto/keygen.ts
Implement `generateKeypair` using `node:crypto` `generateKeyPairSync`. Export `CUSTODY_WARNING` constant. Keys in Base64url. Support `'ed25519'` (default).

### Task 4: Create packages/core/src/crypto/index.ts
Re-export all functions and constants.

### Task 5: Update packages/core/src/index.ts
Add re-export of crypto primitives from `./crypto/index.js`.

### Task 6: Create packages/core/src/crypto/hash.test.ts
Tests: determinism, correct output length/format, known SHA-256 vector, ALGORITHM_UNSUPPORTED error.

### Task 7: Create packages/core/src/crypto/sign.test.ts
Tests: sign + verify round-trip, invalid signature returns `{ ok: true, value: false }`, wrong public key returns `{ ok: true, value: false }`, ALGORITHM_UNSUPPORTED error.

### Task 8: Create packages/core/src/crypto/keygen.test.ts
Tests: generates keypair with expected format (Base64url strings), public/private key length is reasonable (Ed25519 raw = 32 bytes = 43 Base64url chars), CUSTODY_WARNING is a non-empty string, ALGORITHM_UNSUPPORTED for bad scheme.

### Task 9: Run full pipeline
`pnpm turbo build test typecheck lint --filter=@glory-chain/core` — all green.

---

## Dev Notes

### Node.js Built-in Crypto — No External Deps

Use `node:crypto` exclusively. The `node:` prefix is mandatory for built-ins in this project (explicit Node.js built-in import). Do not use `import { createHash } from 'crypto'` — always use `import { createHash } from 'node:crypto'`.

```typescript
import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto';
```

tsdown and bundlers treat `node:*` imports as externals — they are never bundled. This preserves the zero-dep contract.

### Ed25519 Key Format — Use 'raw' for Compact Storage

Node.js `generateKeyPairSync('ed25519')` returns `KeyObject` instances. Export them as raw bytes for compact storage:

```typescript
const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'der' },
});
```

However, for signing/verification, Node.js requires `KeyObject` (not raw bytes). The approach:
1. **keygen** — generate `KeyObject`, export public key as `spki`+`der` → Base64url, export private key as `pkcs8`+`der` → Base64url
2. **sign** — import private key from Base64url (decode from Base64url → Buffer, then `createPrivateKey({ key: buffer, format: 'der', type: 'pkcs8' })`)
3. **verify** — import public key from Base64url (decode from Base64url → Buffer, then `createPublicKey({ key: buffer, format: 'der', type: 'spki' })`)

Ed25519 raw key is 32 bytes. SPKI-wrapped public key is 44 bytes. PKCS8-wrapped private key is 48 bytes. Base64url of 44 bytes = 59 chars. Base64url of 48 bytes = 64 chars. These are the expected key lengths in tests.

### Base64url Encoding

Node.js Buffer supports `'base64url'` encoding natively:
```typescript
buffer.toString('base64url')
Buffer.from(base64urlString, 'base64url')
```

Use this consistently for all key and signature encoding. Do not implement custom Base64url encoding.

### Ed25519 Signing with node:crypto

```typescript
import { sign, verify, createPrivateKey, createPublicKey } from 'node:crypto';

// Sign: algorithm param is null/undefined for Ed25519 (algorithm is implicit in key type)
const signature = sign(null, Buffer.from(payload), privateKeyObject);

// Verify
const isValid = verify(null, Buffer.from(payload), publicKeyObject, signature);
```

The `null` algorithm argument is correct and required for Ed25519 — the algorithm is specified by the key type, not the function call.

### Supported Algorithm Strings

For this story, supported values are exactly:
- `hashAlgorithm`: `'sha256'` (case-insensitive is fine but normalize to lowercase)
- `signatureScheme`: `'ed25519'` (case-insensitive is fine but normalize to lowercase)

Any other value returns `{ ok: false, error: { code: ErrorCode.ALGORITHM_UNSUPPORTED, message: `Unsupported algorithm: ${algorithm}` } }`.

### CUSTODY_WARNING Constant

FR7 requires the CLI to display a mandatory custody warning before outputting any private key material. The warning string lives in `keygen.ts` (not the CLI) so it travels with the key generation function and cannot be accidentally omitted.

```typescript
export const CUSTODY_WARNING = `WARNING: Private key material is about to be displayed.
Store this key securely — it cannot be recovered if lost.
Anyone with access to this key can forge blocks on your chain.
Do NOT share, commit to version control, or paste into a chat.`;
```

The `generateKeypair` function is pure and does NOT print this warning. The CLI layer (Story 4.3) is responsible for displaying it before printing key output. This keeps `packages/core` I/O-free.

### verbatimModuleSyntax in Crypto Files

All imports from `./errors.js` for types must use `import type`:
```typescript
import type { GloryChainError, Result } from '../schema/errors.js';
import { ErrorCode } from '../schema/errors.js';
```

Note: `ErrorCode` is a value (const object) — it must be a regular import, not `import type`.

### Test Vectors

Use a known SHA-256 vector to catch regressions:
- `hashBlock("hello")` → `"2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"`
- This is the SHA-256 hash of the UTF-8 string "hello"

For Ed25519 tests, generate a fresh keypair per test (don't hardcode keys — they're generated fresh each time). Test the round-trip: sign a payload, verify with the correct public key → `{ ok: true, value: true }`. Then verify with a different public key → `{ ok: true, value: false }`.

---

## Complete Implementation

### packages/core/src/crypto/hash.ts

```typescript
import { createHash } from "node:crypto";
import { ErrorCode } from "../schema/errors.js";
import type { GloryChainError, Result } from "../schema/errors.js";

const SUPPORTED_HASH_ALGORITHMS = new Set(["sha256"]);

export function hashBlock(
  payload: string,
  algorithm = "sha256",
): Result<string, GloryChainError> {
  const algo = algorithm.toLowerCase();
  if (!SUPPORTED_HASH_ALGORITHMS.has(algo)) {
    return {
      ok: false,
      error: {
        code: ErrorCode.ALGORITHM_UNSUPPORTED,
        message: `Unsupported hash algorithm: ${algorithm}`,
      },
    };
  }
  const hash = createHash(algo).update(payload, "utf8").digest("hex");
  return { ok: true, value: hash };
}
```

### packages/core/src/crypto/sign.ts

```typescript
import {
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";
import { ErrorCode } from "../schema/errors.js";
import type { GloryChainError, Result } from "../schema/errors.js";

const SUPPORTED_SIGNATURE_SCHEMES = new Set(["ed25519"]);

export function signBlock(
  payload: string,
  privateKeyBase64url: string,
  scheme = "ed25519",
): Result<string, GloryChainError> {
  const s = scheme.toLowerCase();
  if (!SUPPORTED_SIGNATURE_SCHEMES.has(s)) {
    return {
      ok: false,
      error: {
        code: ErrorCode.ALGORITHM_UNSUPPORTED,
        message: `Unsupported signature scheme: ${scheme}`,
      },
    };
  }
  const keyBuffer = Buffer.from(privateKeyBase64url, "base64url");
  const privateKey = createPrivateKey({
    key: keyBuffer,
    format: "der",
    type: "pkcs8",
  });
  const signature = sign(null, Buffer.from(payload, "utf8"), privateKey);
  return { ok: true, value: signature.toString("base64url") };
}

export function verifyBlock(
  payload: string,
  signatureBase64url: string,
  publicKeyBase64url: string,
  scheme = "ed25519",
): Result<boolean, GloryChainError> {
  const s = scheme.toLowerCase();
  if (!SUPPORTED_SIGNATURE_SCHEMES.has(s)) {
    return {
      ok: false,
      error: {
        code: ErrorCode.ALGORITHM_UNSUPPORTED,
        message: `Unsupported signature scheme: ${scheme}`,
      },
    };
  }
  const keyBuffer = Buffer.from(publicKeyBase64url, "base64url");
  const publicKey = createPublicKey({
    key: keyBuffer,
    format: "der",
    type: "spki",
  });
  const sigBuffer = Buffer.from(signatureBase64url, "base64url");
  const isValid = verify(
    null,
    Buffer.from(payload, "utf8"),
    publicKey,
    sigBuffer,
  );
  return { ok: true, value: isValid };
}
```

### packages/core/src/crypto/keygen.ts

```typescript
import { generateKeyPairSync } from "node:crypto";
import { ErrorCode } from "../schema/errors.js";
import type { GloryChainError, Result } from "../schema/errors.js";

const SUPPORTED_SCHEMES = new Set(["ed25519"]);

// FR7: Mandatory custody warning — displayed by callers (CLI) before any key output.
// This function is pure — it does NOT print or log. The CLI layer must display this.
export const CUSTODY_WARNING = `WARNING: Private key material is about to be displayed.
Store this key securely — it cannot be recovered if lost.
Anyone with access to this key can forge blocks on your chain.
Do NOT share, commit to version control, or paste into a chat.`;

export function generateKeypair(
  scheme = "ed25519",
): Result<{ publicKey: string; privateKey: string }, GloryChainError> {
  const s = scheme.toLowerCase();
  if (!SUPPORTED_SCHEMES.has(s)) {
    return {
      ok: false,
      error: {
        code: ErrorCode.ALGORITHM_UNSUPPORTED,
        message: `Unsupported signature scheme: ${scheme}`,
      },
    };
  }
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });
  return {
    ok: true,
    value: {
      publicKey: (publicKey as Buffer).toString("base64url"),
      privateKey: (privateKey as Buffer).toString("base64url"),
    },
  };
}
```

### packages/core/src/crypto/index.ts

```typescript
export { hashBlock } from "./hash.js";
export { generateKeypair, CUSTODY_WARNING } from "./keygen.js";
export { signBlock, verifyBlock } from "./sign.js";
```

### packages/core/src/crypto/hash.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { hashBlock } from "./hash.js";

describe("hashBlock", () => {
  it("returns lowercase hex SHA-256 for known input", () => {
    const result = hashBlock("hello");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(
        "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      );
    }
  });

  it("returns 64-char hex for SHA-256", () => {
    const result = hashBlock("glory-chain-block-payload");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(64);
      expect(result.value).toMatch(/^[0-9a-f]+$/);
    }
  });

  it("is deterministic — same input always produces same output", () => {
    const a = hashBlock("determinism-test");
    const b = hashBlock("determinism-test");
    expect(a).toEqual(b);
  });

  it("returns ALGORITHM_UNSUPPORTED for unknown algorithm", () => {
    const result = hashBlock("payload", "blake3");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALGORITHM_UNSUPPORTED");
    }
  });

  it("accepts sha256 case-insensitively", () => {
    const lower = hashBlock("test", "sha256");
    const upper = hashBlock("test", "SHA256");
    expect(lower.ok).toBe(true);
    expect(upper.ok).toBe(true);
    if (lower.ok && upper.ok) {
      expect(lower.value).toBe(upper.value);
    }
  });
});
```

### packages/core/src/crypto/sign.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { generateKeypair } from "./keygen.js";
import { signBlock, verifyBlock } from "./sign.js";

describe("signBlock / verifyBlock", () => {
  it("sign + verify round-trip returns true for correct key", () => {
    const kp = generateKeypair();
    expect(kp.ok).toBe(true);
    if (!kp.ok) return;

    const payload = "block-payload-content";
    const signed = signBlock(payload, kp.value.privateKey);
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;

    const verified = verifyBlock(payload, signed.value, kp.value.publicKey);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.value).toBe(true);
    }
  });

  it("returns false (not error) for wrong public key", () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    expect(kp1.ok).toBe(true);
    expect(kp2.ok).toBe(true);
    if (!kp1.ok || !kp2.ok) return;

    const signed = signBlock("payload", kp1.value.privateKey);
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;

    // Verify with wrong key — should be ok: true, value: false (not an error)
    const verified = verifyBlock("payload", signed.value, kp2.value.publicKey);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.value).toBe(false);
    }
  });

  it("returns false for tampered payload", () => {
    const kp = generateKeypair();
    expect(kp.ok).toBe(true);
    if (!kp.ok) return;

    const signed = signBlock("original-payload", kp.value.privateKey);
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;

    const verified = verifyBlock(
      "tampered-payload",
      signed.value,
      kp.value.publicKey,
    );
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.value).toBe(false);
    }
  });

  it("returns ALGORITHM_UNSUPPORTED for unknown sign scheme", () => {
    const result = signBlock("payload", "fakeprivkey", "rsa-pss");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALGORITHM_UNSUPPORTED");
    }
  });

  it("returns ALGORITHM_UNSUPPORTED for unknown verify scheme", () => {
    const result = verifyBlock("payload", "fakesig", "fakepubkey", "ecdsa");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALGORITHM_UNSUPPORTED");
    }
  });
});
```

### packages/core/src/crypto/keygen.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { CUSTODY_WARNING, generateKeypair } from "./keygen.js";

describe("generateKeypair", () => {
  it("generates a keypair with Base64url-encoded strings", () => {
    const result = generateKeypair();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Base64url chars only (no +, /, =)
    expect(result.value.publicKey).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.value.privateKey).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique keypairs on each call", () => {
    const a = generateKeypair();
    const b = generateKeypair();
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.publicKey).not.toBe(b.value.publicKey);
    expect(a.value.privateKey).not.toBe(b.value.privateKey);
  });

  it("public key is SPKI-DER format (44 bytes = 59 Base64url chars)", () => {
    // Ed25519 SPKI-DER public key = 44 bytes → 59 base64url chars (no padding)
    const result = generateKeypair();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Decode and check byte length
    const pub = Buffer.from(result.value.publicKey, "base64url");
    expect(pub.length).toBe(44);
  });

  it("private key is PKCS8-DER format (48 bytes)", () => {
    // Ed25519 PKCS8-DER private key = 48 bytes
    const result = generateKeypair();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const priv = Buffer.from(result.value.privateKey, "base64url");
    expect(priv.length).toBe(48);
  });

  it("returns ALGORITHM_UNSUPPORTED for unknown scheme", () => {
    const result = generateKeypair("rsa");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALGORITHM_UNSUPPORTED");
    }
  });
});

describe("CUSTODY_WARNING", () => {
  it("is a non-empty string", () => {
    expect(typeof CUSTODY_WARNING).toBe("string");
    expect(CUSTODY_WARNING.length).toBeGreaterThan(0);
  });

  it("contains key safety language", () => {
    expect(CUSTODY_WARNING.toLowerCase()).toContain("private key");
  });
});
```

---

## Updated packages/core/src/index.ts

The existing `index.ts` needs one new export block added:

```typescript
// Crypto primitives
export { hashBlock } from "./crypto/index.js";
export { CUSTODY_WARNING, generateKeypair } from "./crypto/index.js";
export { signBlock, verifyBlock } from "./crypto/index.js";
```

Or more cleanly, all from one line:
```typescript
export { CUSTODY_WARNING, generateKeypair, hashBlock, signBlock, verifyBlock } from "./crypto/index.js";
```

---

## Traceability

| Acceptance Criterion | PRD/Arch Requirement |
|---------------------|---------------------|
| SHA-256 hashing, lowercase hex | FR56 — deterministic hash output |
| Ed25519 signing/verification | FR56 — signature scheme |
| ALGORITHM_UNSUPPORTED error | FR50 — error codes |
| Configurable algorithm via string | Architecture — `hashAlgorithm`/`signatureScheme` in ChainMetadata |
| keygen with CUSTODY_WARNING | FR7 — mandatory custody warning |
| Zero runtime deps | NFR14 |
| node:crypto only | NFR17 — bundle size / purity |
| Result<T,E> pattern | Architecture — error handling |

---

## Out of Scope for This Story

- Block hash construction (combines multiple fields — Story 2.4)
- Signing a full block payload (Story 2.3/2.4 — needs canonical payload format)
- Multi-algorithm support beyond SHA-256 / Ed25519 (future story if needed)
- Key storage or key management (CLI config, Story 4.x)

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
- `packages/core/src/crypto/hash.ts`
- `packages/core/src/crypto/sign.ts`
- `packages/core/src/crypto/keygen.ts`
- `packages/core/src/crypto/index.ts`
- `packages/core/src/crypto/hash.test.ts`
- `packages/core/src/crypto/sign.test.ts`
- `packages/core/src/crypto/keygen.test.ts`
- `packages/core/src/index.ts` (updated — add crypto exports)
