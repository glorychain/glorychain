# Self-hosted chain on GitHub

Store your chain directly in a GitHub repository — versioned, public, and automatically updated on every merge.

---

## What this gives you

- Your chain lives in your GitHub repo as a JSON file in `chains/`
- Every merge to `main` automatically appends a block recording the commit
- Anyone can clone the repo and run `glorychain verify` to check integrity
- The chain is public, permanent, and attributable

---

## Setup

### 1. Initialise the project

In your repository root:

```bash
glorychain init --github
```

This creates:
- `chains/` — where chain files are stored
- `.glorychain/config.json` — local config
- `CHAIN_CHARTER.md` — template for describing your chain's purpose
- `.github/workflows/chain-genesis.yml` — creates the genesis block on first merge
- `.github/workflows/chain-append.yml` — appends a block on every subsequent merge

### 2. Edit your chain charter

Open `CHAIN_CHARTER.md` and describe what this chain is for. This content becomes your genesis block — it's the permanent statement of purpose.

```markdown
# Chain Charter

## Purpose
Permanent audit trail for all production deployments to payments-api.

## Signatories
Signed by the deploy-bot service account.

## Governance rules
Blocks are appended automatically by CI on every merge to main.
```

### 3. Generate a keypair

```bash
glorychain keygen
```

Save the output — you'll need both keys as GitHub secrets.

### 4. Add secrets to GitHub

In your repository: **Settings → Secrets and variables → Actions → New repository secret**

Add two secrets:
- `CHAIN_PRIVATE_KEY` — the private key from step 3
- `CHAIN_PUBLIC_KEY` — the public key from step 3

### 5. Merge to main

On the first merge to `main`, the genesis workflow runs and creates your chain. Every subsequent merge appends a block containing the commit message and SHA.

---

## What the chain looks like

```
Block 0   "Permanent audit trail for all production deployments to payments-api..."
           (contents of CHAIN_CHARTER.md)

Block 1   "MERGE: fix: rate limit calculation — a3f9c12"
Block 2   "MERGE: feat: add retry logic for downstream timeouts — b7e2d45"
Block 3   "MERGE: chore: release v2.15.0 — c9f1a78"
```

---

## Verifying the chain

Anyone with the repo can verify:

```bash
git clone https://github.com/your-org/your-repo
cd your-repo
glorychain verify --chain <chainId>
```

Or use the GitHub connector to verify directly from the remote:

```ts
import { GitHubConnector } from "@glorychain/github"
import { verifyChain } from "@glorychain/core"

const connector = new GitHubConnector({ owner: "your-org", repo: "your-repo" })
const chain = await connector.read(chainId)
const result = await verifyChain(chain)
console.log(result.valid) // true
```

---

## Tamper detection

The GitHub connector supports watching a chain for tampering:

```ts
const connector = new GitHubConnector({ owner: "your-org", repo: "your-repo" })

connector.watch(chainId, (event) => {
  if (event.type === "tampered") {
    console.error("Chain tampered at block", event.blockNumber)
  }
})
```

This polls the remote chain and alerts if the hash chain breaks.

---

## Key rotation

If your signing keypair is compromised, [fork the chain](forking.md) rather than replacing it. Forking creates a new chain that carries provenance from the original — the record of what happened before the fork is preserved.
