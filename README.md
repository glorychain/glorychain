<div align="center">

# glorychain

[![CI][ci_img]][ci_url]
[![npm][npm_img]][npm_url]
[![License][license_img]][license_url]
[![TypeScript][ts_img]][ts_url]

> An open protocol for verifiable institutional truth.

Immutable, cryptographically signed chains of records. Every block tamper-evident. Every block permanently attributable. No silent edits. No deletions.

**The platform is a notary, not a judge.**

</div>

---

## What it is

glorychain lets anyone create a **tamper-evident audit log** backed by Ed25519 signatures and SHA-256 hash chaining. Modify any block and every subsequent hash breaks — tampering is mathematically detectable by anyone with a copy of the chain.

Chains can live in the filesystem, in a GitHub repository, or in any storage backend via the connector interface.

---

## What chains look like

### ⚖️ A planning authority that can't quietly reverse a decision

```
chain: westfield-planning-authority
signer: planning.secretary@westfield.gov.uk

Block 0   "Official public record of all planning decisions. Immutable from this point."
Block 1   "PA/2026/0042 APPROVED — 240-unit residential, North Quarter. Vote 6–2–1. Ref: councillor-pack-042.pdf"
Block 2   "PA/2026/0091 REFUSED — Change of use, 14 High Street. Vote 7–0–2."
Block 3   "PA/2026/0042 AMENDED — height reduced from 12 to 9 storeys following judicial review."
```

Block 1 can never be silently deleted. Block 3 proves Block 1 happened.

---

### 🏛️ A board that can't claim a resolution was never passed

```
chain: acme-aid-board-resolutions
signer: board.chair@acme-aid.org

Block 0   "Binding board decision register. Both the Executive Director and Board Chair must co-sign."
Block 1   "RESOLUTION 2026-001: Annual budget of $2.4M approved. Unanimous (9/9). 12 Jan 2026."
Block 2   "RESOLUTION 2026-002: Safeguarding policy overhauled. Vote 8–1. Effective immediately."
Block 3   "RESOLUTION 2026-003: CEO contract renewed for 3 years. Vote 7–2. Salary band: Band 5."
```

Anyone can verify this chain. Any gap or modification is immediately visible.

---

### 🔧 An architecture register that outlasts the people who made the decisions

```
chain: hyperdb-adr
signer: core-team@hyperdb.dev

Block 0   "Architecture Decision Register. Append-only. Superseded decisions noted in later blocks."
Block 1   "ADR-001: RocksDB chosen over LevelDB. Column families required for transaction log isolation."
Block 2   "ADR-002: Single-writer model adopted. Eliminates conflict resolution at the protocol layer."
Block 3   "ADR-003: ADR-001 superseded — migrating to custom LSM. RocksDB licence incompatible with v3."
```

New maintainers can trace every architectural decision back to its moment of signing.

---

### 📋 A legislator's climate record — publicly, permanently, on their own terms

```
chain: sen-maya-rodriguez-climate-register
signer: senator.rodriguez@senate.gov

Block 0   "I am creating this chain as a permanent public record of my climate votes and commitments."
Block 1   "VOTED YES — Clean Energy Transition Act (SB-412). Passed 52–48. 3 Feb 2026."
Block 2   "COMMITTED — Net zero target for district by 2035. Press release: rodriguez.senate.gov/2026/02/netzero"
Block 3   "VOTED NO — Carbon Border Adjustment waiver (SB-519). Failed 41–59. 14 Mar 2026."
```

Constituents can verify the chain. No press team can rewrite it.

---

### 🖥️ A production system where every config change is permanently attributed

```
chain: payments-api-audit
signer: deploy-bot@company.com

Block 0   "Automated audit trail. All deploys and config changes appended by CI. Human approvals noted."
Block 1   "DEPLOY v2.14.1 — fix: rate limit off-by-one. SHA: a3f9c12. Triggered: jane.smith@company.com"
Block 2   "CONFIG: rate_limit_multiplier 1.0 → 1.5. Approved: oncall-lead@company.com. Incident: INC-4821"
Block 3   "ROLLBACK to v2.14.0 — p99 latency spike post-deploy. Triggered: auto-rollback. 03:17 UTC"
```

When the auditors come, the chain speaks for itself.

---

## Quick start

```bash
npm install -g glorychain
```

```bash
# 1. Generate a keypair
glorychain keygen

# 2. Create a chain
glorychain create \
  --key <privateKey> \
  --pubkey <publicKey> \
  --content "My org governance register" \
  --purpose "Board decisions"

# 3. Append records
glorychain append \
  --chain <chainId> \
  --key <privateKey> \
  --pubkey <publicKey> \
  --content "RESOLUTION 2026-001: Budget approved."

# 4. Verify integrity
glorychain verify --chain <chainId>
```

Or initialise a full project directory:

```bash
glorychain init --content "Audit trail for this repo" --github
```

The `--github` flag scaffolds GitHub Actions workflows that automatically append a block to your chain on every merge to `main`.

---

## How it works

```
Genesis ──► Block 1 ──► Block 2 ──► Block 3
  hash ────────► hash ────────► hash ────────► hash
```

1. **Keygen** — generate an Ed25519 keypair
2. **Create** — genesis block is signed and hashed
3. **Append** — each new block includes the previous block's hash and a fresh signature
4. **Verify** — anyone can check every hash and every signature locally, with no external dependency

Modify any block → every subsequent hash breaks. **Tampering is mathematically detectable.**

---

## Packages

| Package | Version | Description |
|---|---|---|
| [`@glorychain/core`](packages/core) | [![core][core_img]][core_url] | Protocol — chain lifecycle, crypto, verification |
| [`@glorychain/structures`](packages/structures) | [![structures][structures_img]][structures_url] | Stateful structures — OrgTree, KeyValueStore, MemberSet |
| [`@glorychain/fs`](packages/fs) | [![fs][fs_img]][fs_url] | Filesystem connector |
| [`@glorychain/github`](packages/github) | [![gh][gh_img]][gh_url] | GitHub connector + tamper detection |
| [`@glorychain/shared`](packages/shared) | [![shared][shared_img]][shared_url] | Zod validators + shared types |
| [`glorychain` CLI](apps/cli) | [![cli][cli_img]][cli_url] | Full lifecycle management from the terminal |
| [Conformance suite](apps/conformance) | — | Protocol compliance testing |

---

## Repo structure

```
packages/core        @glorychain/core    — protocol library
packages/fs          @glorychain/fs      — filesystem connector
packages/github      @glorychain/github  — GitHub connector
packages/shared      @glorychain/shared  — types + validators
apps/cli             glorychain          — CLI (11 commands)
apps/conformance                         — conformance test suite
docs/                                    — protocol spec, CLI reference, connector guide
```

---

## Development

**Prerequisites:** Node 18+, pnpm 10+

```bash
git clone https://github.com/finnfitzsimons3/glorychain
cd glorychain
pnpm install
pnpm build
pnpm test
```

```bash
pnpm lint        # Biome lint
pnpm typecheck   # TypeScript
pnpm format      # auto-format
```

---

## Documentation

- [Protocol specification](docs/protocol-spec.md)
- [CLI reference](docs/cli-reference.md)
- [Connector authoring guide](docs/connector-guide.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

---

[Contributing](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [MIT][license_url]

<!-- Badges -->
[ci_img]: https://img.shields.io/github/actions/workflow/status/finnfitzsimons3/glorychain/ci.yml?branch=main&label=CI&style=for-the-badge
[ci_url]: https://github.com/finnfitzsimons3/glorychain/actions/workflows/ci.yml
[npm_img]: https://img.shields.io/npm/v/glorychain?style=for-the-badge&label=npm
[npm_url]: https://www.npmjs.com/package/glorychain
[license_img]: https://img.shields.io/badge/license-MIT-blue?style=for-the-badge
[license_url]: ./LICENSE
[ts_img]: https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[ts_url]: https://www.typescriptlang.org/
[core_img]: https://img.shields.io/npm/v/@glorychain/core?label=%20&style=flat-square
[core_url]: https://www.npmjs.com/package/@glorychain/core
[fs_img]: https://img.shields.io/npm/v/@glorychain/fs?label=%20&style=flat-square
[fs_url]: https://www.npmjs.com/package/@glorychain/fs
[gh_img]: https://img.shields.io/npm/v/@glorychain/github?label=%20&style=flat-square
[gh_url]: https://www.npmjs.com/package/@glorychain/github
[shared_img]: https://img.shields.io/npm/v/@glorychain/shared?label=%20&style=flat-square
[shared_url]: https://www.npmjs.com/package/@glorychain/shared
[cli_img]: https://img.shields.io/npm/v/glorychain?label=%20&style=flat-square
[cli_url]: https://www.npmjs.com/package/glorychain
[structures_img]: https://img.shields.io/npm/v/@glorychain/structures?label=%20&style=flat-square
[structures_url]: https://www.npmjs.com/package/@glorychain/structures
