# @glorychain/github

> GitHub connector for glorychain. Read and watch chains stored in GitHub repositories, and scaffold new glorychain-enabled repos in seconds.

```bash
npm install @glorychain/github
# or
pnpm add @glorychain/github
```

GitHub is a natural persistence layer for public chains — it's free, widely trusted, has a permanent public URL, and is passively archived by the Internet Archive. A chain stored in a GitHub repo is readable and verifiable even if the glorychain SaaS goes offline forever.

---

## Connector

```typescript
import { GitHubConnector } from "@glorychain/github";

const connector = new GitHubConnector({
  owner:          "my-org",
  repo:           "my-repo",
  token:          process.env.GITHUB_TOKEN,
  branch:         "main",    // default: "main"
  dir:            "chains",  // default: "chains"
  pollIntervalMs: 30_000,    // default: 30s
});

// Read a chain
const chain = await connector.read(chainId);

// Write (after appending a block via @glorychain/core)
await connector.write(chain);
```

### Watching for changes

The `watch()` method polls the GitHub Contents API and yields events on changes. It runs integrity verification on every detected change — anomalies produce threat events before your code sees the new state.

```typescript
for await (const event of connector.watch(chainId)) {
  if (event.type === "FILE_MISSING") {
    console.error("Chain file missing — possible deletion attack");
  }
  if (event.type === "BLOCK_MODIFIED") {
    console.error("Chain integrity broken — investigate immediately");
  }
  if (event.type === "REPO_MADE_PRIVATE") {
    console.warn("Repo visibility changed — public chain may be inaccessible");
  }
}
```

---

## Repo scaffolding

`scaffoldRepo()` writes the standard glorychain file structure to a GitHub repository via the GitHub Contents API. Existing files are skipped — safe to re-run at any time.

```typescript
import { scaffoldRepo } from "@glorychain/github";

const results = await scaffoldRepo(
  {
    owner: "my-org",
    repo:  "my-repo",
    token: process.env.GITHUB_TOKEN,
  },
  {
    branch: "main",
    dir:    "chains",
  },
);

// results — array of { path, status: "created" | "skipped" }
```

### Files written

| File | Purpose |
|------|---------|
| `.github/workflows/glorychain-verify.yml` | CI — verifies chain integrity on every push and PR |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR checklist for block submissions via pull request |
| `.github/ISSUE_TEMPLATE/block-submission.yml` | Issue template for proposing new blocks |
| `.github/ISSUE_TEMPLATE/adr.yml` | Issue template for architecture decision records |
| `docs/adr/.gitkeep` | Placeholder for the ADR directory |
| `CHAIN_CHARTER.md` | Governance template — defines who can append, under what conditions |
| `CONTRIBUTING.md` | Contributor guide — delegates all policy to `CHAIN_CHARTER.md` |
| `chains/.gitkeep` | Placeholder for the chain storage directory |
| `.glorychain.json` | Connector config (owner, repo, branch, dir) |

---

## The CHAIN_CHARTER and genesis block

`CHAIN_CHARTER.md` is where governance lives — who controls the chain, what kinds of blocks are acceptable, how disputes are resolved. Fill it in before creating the genesis block.

Then embed it in the genesis block so governance itself is on-chain and tamper-evident:

```bash
glorychain create \
  --key $PRIVATE_KEY \
  --pubkey $PUBLIC_KEY \
  --content "$(cat CHAIN_CHARTER.md)" \
  --purpose "governance"
```

The charter is now part of the immutable record. Anyone can read it, and nobody can quietly change it.

---

## CI integration

The `glorychain-verify.yml` workflow written by `scaffoldRepo()` automatically runs the conformance suite on every push and pull request:

```yaml
# .github/workflows/glorychain-verify.yml (auto-generated)
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx @glorychain/conformance run --connector github ...
```

PRs that break chain integrity are blocked before merging. **Tamper-evidence in CI.**

---

## CLI shortcut

Use `glorychain init --github` to scaffold GitHub Actions workflows for automated chain management in your repo:

```bash
glorychain init --github
```

This creates `.github/workflows/chain-genesis.yml` and `.github/workflows/chain-append.yml`. Add `CHAIN_PRIVATE_KEY` and `CHAIN_PUBLIC_KEY` to your GitHub repo secrets to activate them.

---

## Why GitHub?

- **Free and permanent** — public repos are free; URLs don't change
- **Trusted infrastructure** — GitHub's uptime and audit logs are credible
- **Passively archived** — the Internet Archive and other crawlers index public repos continuously
- **Pull-request workflow** — block submissions via PR give you review, discussion, and audit history before a block is merged
- **No single point of failure** — the chain remains readable and verifiable if glorychain SaaS goes offline permanently

A chain on GitHub is a chain on the open web.
