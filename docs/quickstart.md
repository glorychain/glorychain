# Quickstart

From zero to a verified chain in 5 minutes.

---

## Install

```bash
npm install -g glorychain
```

---

## 1. Generate a keypair

```bash
glorychain keygen
```

Output:
```
publicKey   abc123...
privateKey  xyz789...
```

**Save your private key somewhere safe.** It cannot be recovered. Anyone who has it can append to your chain.

---

## 2. Create a chain

```bash
glorychain create \
  --key <privateKey> \
  --pubkey <publicKey> \
  --content "Board decision register for Acme Aid. Append-only from this point." \
  --purpose "NGO governance"
```

Output:
```
✓ Chain created
chainId   550e8400-e29b-41d4-a716-446655440000
```

This creates a `chains/` directory with a JSON file containing your genesis block.

---

## 3. Append a record

```bash
glorychain append \
  --chain 550e8400-e29b-41d4-a716-446655440000 \
  --key <privateKey> \
  --pubkey <publicKey> \
  --content "RESOLUTION 2026-001: Annual budget of $2.4M approved. Unanimous (9/9)."
```

Output:
```
✓ Block appended
blockNumber   1
```

---

## 4. Verify the chain

```bash
glorychain verify --chain 550e8400-e29b-41d4-a716-446655440000
```

Output:
```
✓ Chain verified — all blocks intact
valid   true
```

---

## 5. Inspect the chain

```bash
glorychain inspect --chain 550e8400-e29b-41d4-a716-446655440000
```

This displays every block with its content, timestamp, signer, and hash.

---

## What just happened

You created a chain with two blocks:

- **Block 0** (genesis) — signed with your keypair, hashed
- **Block 1** — signed with your keypair, includes the SHA-256 hash of Block 0

If anyone modifies Block 0's content, Block 1's hash no longer matches — and `verify` will catch it. The tampering is mathematically detectable.

---

## Next steps

- [Store your chain in a GitHub repository](guides/self-hosted-chain.md)
- [Use glorychain programmatically](guides/programmatic-api.md)
- [Enforce content structure with schemas](guides/schema-validation.md)
- [See real-world use cases](use-cases.md)
