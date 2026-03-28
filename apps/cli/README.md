# glorychain CLI

> Full chain lifecycle management from your terminal. No server required.

```bash
npm install -g glorychain
```

---

## Quickstart

```bash
# 1. Generate a keypair (store the private key securely)
glorychain keygen

# 2. Create a chain
glorychain create \
  --key $PRIVATE_KEY \
  --pubkey $PUBLIC_KEY \
  --content "My Organisation Board Decisions" \
  --purpose "governance"

# 3. Append your first real block
glorychain append \
  --chain <chainId> \
  --key $PRIVATE_KEY \
  --pubkey $PUBLIC_KEY \
  --content "Board meeting 2026-03-22: approved new budget. Motion: Jane Smith."

# 4. Verify the whole chain
glorychain verify --chain <chainId>
```

---

## Commands

### `keygen`

Generate an Ed25519 keypair.

```bash
glorychain keygen
```

Output: `publicKey` and `privateKey` (base64url). Store your private key securely — it cannot be recovered.

---

### `create`

Create a new chain.

```bash
glorychain create \
  --key <privateKey> \
  --pubkey <publicKey> \
  --content "Genesis block content" \
  [--purpose "governance"] \
  [--creator "alice@example.com"] \
  [--dir ./chains]
```

---

### `append`

Append a block to an existing chain.

```bash
glorychain append \
  --chain <chainId> \
  --key <privateKey> \
  --pubkey <publicKey> \
  --content "Block content" \
  [--dir ./chains]
```

---

### `verify`

Verify the integrity of a chain.

```bash
glorychain verify --chain <chainId> [--dir ./chains]
```

Checks: hash continuity, signatures, block sequence, timestamp validity, schema conformance.

---

### `inspect`

Display the contents of a specific block.

```bash
glorychain inspect --chain <chainId> --block <n> [--dir ./chains] [--json]
```

`--block` is required. Use `0` for the genesis block.

---

### `fork`

Fork a chain from a given block.

```bash
glorychain fork \
  --chain <chainId> \
  --block <n> \
  --key <newPrivateKey> \
  --pubkey <newPublicKey> \
  --content "Fork genesis content" \
  [--purpose fork] \
  [--dir ./chains]
```

Forking preserves the original chain intact. The new chain carries provenance — it knows where it came from. Use it when a signing key is compromised or a governance change requires a new signer.

---

### `migrate`

Migrate a chain from one directory to another.

```bash
glorychain migrate \
  --chain <chainId> \
  --from ./chains \
  --to ./archive
```

---

### `feed`

Generate an Atom 1.0 feed of a chain.

```bash
glorychain feed --chain <chainId> [--dir ./chains] [--base-url <url>]
```

---

### `export`

Export a chain to a JSON file.

```bash
glorychain export --chain <chainId> [--out ./export.json] [--dir ./chains]
```

---

### `init`

Initialise a directory for use with glorychain.

```bash
glorychain init \
  [--dir chains] \
  [--preset <preset>] \
  [--github] \
  [--content "Genesis content"] \
  [--key <key>] \
  [--pubkey <pubkey>]
```

With `--preset`: populates `CHAIN_CHARTER.md` with a ready-to-use charter for a specific chain type. Available presets: `governance`, `board-decisions`, `audit-log`, `policy-register`, `membership-register`.

With `--github`: scaffolds `.github/workflows/chain-genesis.yml` and `chain-append.yml`. Requires `CHAIN_PRIVATE_KEY` and `CHAIN_PUBLIC_KEY` repo secrets.

With `--content`: also creates the genesis block immediately.

---

### `template`

Show usage templates.

```bash
glorychain template
```

---

## Full reference

See [docs/reference/cli-reference.md](../../docs/reference/cli-reference.md) for the complete flag reference for every command.
