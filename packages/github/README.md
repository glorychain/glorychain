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
await connector.write(chainId, chain);
```

### Watching for changes

The `watch()` method polls the GitHub Contents API and yields events on changes. It runs integrity verification on every detected change — anomalies produce threat events before your code sees the new state.

```typescript
for await (const event of connector.watch(chainId)) {
  if (event.type === "BLOCK_APPENDED") {
    console.log("New verified block:", event.chainId);
  }
  if (event.type === "HASH_MISMATCH") {
    console.error("Chain integrity broken — investigate immediately");
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
  --name "Acme NGO Governance" \
  --content "$(cat CHAIN_CHARTER.md)" \
  --key $PRIVATE_KEY
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

```bash
glorychain init \
  --owner my-org \
  --repo  my-repo \
  --token $GITHUB_TOKEN \
  [--branch main] \
  [--dir chains]
```

This runs `scaffoldRepo()` and writes `.glorychain.json` to the current directory. All subsequent CLI commands in this repo auto-detect the GitHub connector from that config file.

---

## Why GitHub?

- **Free and permanent** — public repos are free; URLs don't change
- **Trusted infrastructure** — GitHub's uptime and audit logs are credible
- **Passively archived** — the Internet Archive and other crawlers index public repos continuously
- **Pull-request workflow** — block submissions via PR give you review, discussion, and audit history before a block is merged
- **No single point of failure** — the chain remains readable and verifiable if glorychain SaaS goes offline permanently

A chain on GitHub is a chain on the open web.
