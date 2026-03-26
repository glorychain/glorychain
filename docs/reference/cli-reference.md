# CLI Reference

```
npm install -g glorychain
```

---

## keygen

Generate an Ed25519 keypair.

```bash
glorychain keygen
```

**Output:** `publicKey` and `privateKey` (base64url). Store your private key securely — it cannot be recovered.

---

## create

Create a new chain.

```bash
glorychain create \
  --key <privateKey> \
  --pubkey <publicKey> \
  --content "Genesis block content" \
  [--purpose "Governance decisions"] \
  [--creator "alice@example.com"] \
  [--dir ./chains]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--key` | yes | — | Ed25519 private key (base64url) |
| `--pubkey` | yes | — | Ed25519 public key (base64url) |
| `--content` | yes | — | Genesis block content |
| `--purpose` | no | `"general"` | Chain purpose description |
| `--creator` | no | `"anonymous"` | Creator identifier |
| `--dir` | no | `./chains` | Storage directory |
| `--json` | no | — | Output as JSON |

---

## append

Append a block to an existing chain.

```bash
glorychain append \
  --chain <chainId> \
  --key <privateKey> \
  --pubkey <publicKey> \
  --content "Block content" \
  [--dir ./chains]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--chain` | yes | — | Chain ID |
| `--key` | yes | — | Ed25519 private key (base64url) |
| `--pubkey` | yes | — | Ed25519 public key (base64url) |
| `--content` | yes | — | Block content |
| `--dir` | no | `./chains` | Storage directory |
| `--json` | no | — | Output as JSON |

---

## verify

Verify the integrity of a chain.

```bash
glorychain verify --chain <chainId> [--dir ./chains]
```

Checks: hash continuity, signatures, block sequence, timestamp validity, schema conformance.

---

## inspect

Display the contents of a specific block.

```bash
glorychain inspect --chain <chainId> --block <n> [--dir ./chains] [--json]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--chain` | yes | — | Chain ID |
| `--block` | yes | — | Block index to inspect |
| `--dir` | no | `./chains` | Storage directory |
| `--json` | no | — | Output as JSON |

---

## init

Initialise a directory for use with glorychain.

```bash
glorychain init [--dir chains] [--preset <preset>] [--github] [--content "Genesis content"] [--key <key>] [--pubkey <pubkey>]
```

Creates:
- `chains/` directory
- `.glorychain/config.json`
- `CHAIN_CHARTER.md` template

With `--preset`: populates `CHAIN_CHARTER.md` with a ready-to-use charter for a specific chain type. Also sets `--purpose` automatically.

| Preset | Purpose | Suggested structure |
|---|---|---|
| `governance` | `governance` | `VoteRegister` |
| `board-decisions` | `board-decisions` | `DecisionLog` |
| `audit-log` | `audit-log` | `KeyValueStore` |
| `policy-register` | `policy-register` | `DocumentRegister` |
| `membership-register` | `membership` | `MemberSet` |

With `--github`: also scaffolds `.github/workflows/chain-genesis.yml` and `chain-append.yml` for automated chain management. Requires `CHAIN_PRIVATE_KEY` and `CHAIN_PUBLIC_KEY` repo secrets.

With `--content`: also creates the genesis block.

---

## fork

Fork a chain from a given block.

```bash
glorychain fork \
  --chain <chainId> \
  --block <n> \
  --key <privateKey> \
  --pubkey <publicKey> \
  --content "Fork genesis content" \
  [--purpose fork] \
  [--creator anonymous] \
  [--dir ./chains]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--chain` | yes | — | Source chain ID |
| `--block` | yes | — | Block number to fork from |
| `--key` | yes | — | Ed25519 private key (base64url) |
| `--pubkey` | yes | — | Ed25519 public key (base64url) |
| `--content` | yes | — | Fork genesis block content |
| `--purpose` | no | `"fork"` | Fork purpose description |
| `--creator` | no | `"anonymous"` | Creator identifier |
| `--dir` | no | `./chains` | Storage directory |
| `--json` | no | — | Output as JSON |

---

## migrate

Migrate a chain from one filesystem directory to another.

```bash
glorychain migrate \
  --chain <chainId> \
  --from ./chains \
  --to ./archive
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--chain` | yes | — | Chain ID |
| `--from` | yes | — | Source directory |
| `--to` | yes | — | Destination directory |
| `--json` | no | — | Output as JSON |

---

## feed

Generate an Atom 1.0 RSS feed of a chain.

```bash
glorychain feed --chain <chainId> [--dir ./chains] [--base-url <url>]
```

| Flag | Required | Default | Description |
|---|---|---|---|
| `--chain` | yes | — | Chain ID |
| `--dir` | no | `./chains` | Storage directory |
| `--base-url` | no | `https://glorychain.dev` | Base URL for feed links |
| `--json` | no | — | Output as JSON |

---

## export

Export a chain to a JSON file.

```bash
glorychain export --chain <chainId> [--out ./export.json] [--dir ./chains]
```

---

## template

Show usage templates.

```bash
glorychain template
```
