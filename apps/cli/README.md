# glorychain CLI

> Full chain lifecycle management from your terminal. No server required.

The glorychain CLI is a thin, powerful wrapper over `@glorychain/core` — create and manage chains, generate keypairs, verify integrity, export feeds, scaffold GitHub repos, and produce block templates. Everything works completely locally with no service dependency.

```bash
npm install -g @glorychain/cli
# or run without installing
npx @glorychain/cli --help
```

---

## Quickstart

```bash
# 1. Generate a keypair (store the private key securely)
glorychain keygen

# 2. Create a chain
glorychain create \
  --name "My Organisation Decisions" \
  --purpose "Public tamper-evident record of all governance decisions" \
  --key $PRIVATE_KEY

# 3. Append your first real block
glorychain append \
  --chain <chainId> \
  --content "Board meeting 2026-03-22: approved new budget. Motion: Jane Smith." \
  --key $PRIVATE_KEY

# 4. Verify the whole chain
glorychain verify --chain <chainId>
```

---

## Commands

### Chain lifecycle

```bash
# Create a new chain with a genesis block
glorychain create \
  --name    "Chain name" \
  --purpose "What this chain records" \
  --key     <privateKey>

# Append a new signed block
glorychain append \
  --chain   <chainId> \
  --content "Block content" \
  --key     <privateKey>

# Fork a chain from a specific block
glorychain fork \
  --chain       <chainId> \
  --fork-at     <blockNumber> \
  --content     "Reason for fork" \
  --key         <privateKey>
```

**Forking** preserves the full original history up to the fork point, then diverges. Use it when a chain has been compromised, a project splits, or a community wants to preserve a point-in-time snapshot. A fork creates visible lineage — it's not an attack, it's evidence.

---

### Inspection

```bash
# Pretty-print full chain details
glorychain inspect --chain <chainId>

# Inspect a specific block
glorychain inspect --chain <chainId> --block 5

# Verify all signatures and hash linkages
glorychain verify --chain <chainId>

# Export as RSS or Atom feed
glorychain export --chain <chainId> --format rss  > feed.xml
glorychain export --chain <chainId> --format atom > feed.xml
```

`inspect` output includes:

```
Chain: My Organisation Decisions
  ID:       3e7c9f2a-1234-...
  Blocks:   14
  Created:  2026-01-15T09:00:00Z
  Latest:   2026-03-22T14:30:00Z

Block 0 (genesis)
  Author:    MCowBQYDK2V...
  Timestamp: 2026-01-15T09:00:00Z
  Hash:      a3f9c2...
  Content:   "Public record of all board decisions..."

Block 1
  Author:    MCowBQYDK2V...
  Timestamp: 2026-01-22T11:15:00Z
  Hash:      b7e4a1...
  PrevHash:  a3f9c2... ✓
  Signature: ✓
  Content:   "Approved Q1 budget..."
```

---

### Key management

```bash
glorychain keygen
```

Generates a new Ed25519 keypair. Output is preceded by a mandatory custody warning — this is not optional and cannot be suppressed.

```
⚠️  PRIVATE KEY CUSTODY WARNING
Your private key is the only way to sign blocks on this chain.
If you lose it, you permanently lose the ability to append.
If it leaks, anyone who holds it can impersonate you.
Store it in a password manager or secrets vault. Never commit it to version control.

Public key:  MCowBQYDK2VwBCAA...
Private key: MC4CAQAwBQYDK2Vw...
```

---

### GitHub repo scaffolding

```bash
glorychain init \
  --owner my-org \
  --repo  my-repo \
  --token $GITHUB_TOKEN \
  [--branch main] \
  [--dir chains] \
  [--json]
```

Writes the standard glorychain file structure to a GitHub repository:

- CI workflow that verifies chain integrity on every push and PR
- PR and issue templates for block submission
- `CHAIN_CHARTER.md` governance template
- `CONTRIBUTING.md` delegating policy to the charter
- `.glorychain.json` config for subsequent CLI commands

Add `--json` to get machine-readable output for scripting.

---

### Templates

```bash
# Generate a block submission template
glorychain template --type block [--title "Q2 2026 Budget Approval"] [--out block.md]

# Generate an architecture decision record template
glorychain template --type adr   [--title "Use PostgreSQL for SaaS"] [--out adr-001.md]
```

Templates are Markdown stubs — fill them in, then pass the content to `glorychain append`.

---

## Config file

After running `glorychain init`, a `.glorychain.json` is written to your project root:

```json
{
  "owner":  "my-org",
  "repo":   "my-repo",
  "branch": "main",
  "dir":    "chains"
}
```

The CLI reads this automatically. If you're inside a scaffolded repo, you don't need to pass `--owner` / `--repo` flags.

---

## Use case: publishing an NGO's governance chain

```bash
# One-time setup
glorychain keygen  # save the private key to your password manager
glorychain init --owner acme-ngo --repo governance --token $GITHUB_TOKEN

# Embed the charter as the genesis block
glorychain create \
  --name    "Acme NGO Board Decisions" \
  --content "$(cat CHAIN_CHARTER.md)" \
  --key     $PRIVATE_KEY

# Append decisions after every board meeting
glorychain append \
  --chain <chainId> \
  --content "$(cat 2026-03-22-meeting-minutes.md)" \
  --key $PRIVATE_KEY

# Verify integrity at any time
glorychain verify --chain <chainId>
```

The chain is now on GitHub, CI-verified on every push, exportable as RSS, and citable from any article or report.

---

## Use the conformance suite

After creating a chain, run the conformance suite to verify it meets the full protocol spec:

```bash
pnpm --filter @glorychain/conformance exec conformance run \
  --connector github \
  --owner my-org \
  --repo  my-repo \
  --chain <chainId>
```

See [`apps/conformance`](../conformance/README.md) for full documentation.
