<div align="center">

# glorychain

[![License][license_img]][license_url]
[![TypeScript][ts_img]][ts_url]
[![Node][node_img]][node_url]
[![pnpm][pnpm_img]][pnpm_url]

> The transparency layer of the internet. An open protocol for verifiable institutional truth.

Glory Chain is a lightweight, censorship-resistant blockchain protocol that lets any individual, organisation, or community create an **immutable, cryptographically signed chain of records** — anchored to a declared genesis of intent. Every block is tamper-evident. Every block is permanently attributable. No block can be silently edited or removed.

**The platform is a notary, not a judge.** It guarantees cryptographic integrity without evaluating content. Judgment belongs to the reader.

</div>

---

## Contents

- [Packages](#packages)
- [Why this exists](#why-this-exists)
- [How it works](#how-it-works)
- [Benefits](#benefits)
- [Use cases](#use-cases)
- [Getting started](#getting-started)
- [Key design decisions](#key-design-decisions)
- [Protocol spec](#protocol-spec)
- [Monorepo structure](#monorepo-structure)
- [Contributing](#contributing)
- [Licence](#licence)

---

## 📦 Packages

| Package | Description | Docs |
|---------|-------------|------|
| [`@glorychain/core`][core_url] | Protocol library — chain lifecycle, crypto, verification, feeds | [README][core_readme] |
| [`@glorychain/fs`][fs_url] | File system connector — read/write/watch chains on disk | [README][fs_readme] |
| [`@glorychain/github`][github_url] | GitHub connector — read/watch chains in GitHub repos, scaffold new repos | [README][github_readme] |
| [`@glorychain/shared`][shared_url] | Zod validators and TypeScript types shared across all packages | [README][shared_readme] |
| [`glorychain` (CLI)][cli_url] | Full lifecycle management from the terminal, no server required | [README][cli_readme] |
| [Conformance suite][conformance_url] | Protocol compliance testing for any glorychain implementation | [README][conformance_readme] |

> The SaaS platform lives in a separate repo: [glorychain-saas][saas_url]

---

## Why this exists

Information can be falsified, suppressed, or quietly edited by those who control it.

There is no lightweight, open, censorship-resistant way for individuals, organisations, or communities to maintain a verifiable record of truth that **anyone can read, nobody can secretly alter, and that survives attempts to destroy it.**

Traditional blockchains are overkill. Git gives versioning but not tamper-evidence. Centralised platforms can be edited silently. Legal notarisation is expensive and inaccessible.

Glory Chain fills that gap — open source, self-hostable, permissionless to build on.

---

## How it works

A **chain** is an ordered list of signed blocks:

1. The chain creator generates an Ed25519 keypair
2. They create a **genesis block** — the chain's declaration of purpose
3. New blocks are appended by signing with the private key
4. Each block contains the SHA-256 hash of the previous block — a tamper-evident linkage
5. Anyone can verify the entire chain without contacting any server

```
Genesis Block ──► Block 1 ──► Block 2 ──► Block 3
  (intent)       (signed)    (signed)    (signed)
   hash ──────────► hash ──────► hash ──────► hash
```

If any block is modified, every subsequent hash breaks. **Tampering is mathematically detectable.**

---

## Benefits

### `chain creators` — institutions, organisations, individuals

**Your credibility becomes cryptographic.**
Anyone can claim transparency. A Glory Chain *proves* it. When you publish decisions on-chain, your audience doesn't have to trust your communications team — they can verify the record themselves. Credibility stops being a matter of reputation and starts being a matter of math.

**Silence has consequences — so speaking up gets cheaper.**
The hardest part of institutional transparency is the first step. Glory Chain makes it easy to start small: a single genesis block committing to a record. Every block you append is evidence of follow-through. Every week you don't append is visible. The asymmetry shifts — being on record becomes safer than staying silent.

**Your record survives you.**
If your organisation ceases to exist, is acquired, or comes under hostile control, the chain persists. A chain stored on GitHub is readable and verifiable without any server infrastructure. The Internet Archive passively crawls public repos. Your record doesn't depend on anyone keeping the lights on.

**Mistakes become forks, not crises.**
If your private key is compromised or your organisation splits, the chain isn't destroyed — it produces visible lineage. A fork from the point of compromise preserves everything up to that point. The history is intact. The break is explicit. Resilience is built into the model.

**No vendor lock-in.**
Your chain is yours. It lives wherever you put it. Migrate from the file system to GitHub to IPFS — the connector interface is a public contract any third party can implement. The SaaS platform is a convenience layer, not a dependency. If we disappear, your chains remain.

---

### `the public` — readers, journalists, citizens

**Citations that can't be walked back.**
A block permalink returns the same content forever. You can embed it in a published article, a court filing, or a tweet and know that the link will resolve to exactly what you cited — not a quietly updated version. The record doesn't change because someone found it inconvenient.

**Absence is evidence.**
When an institution stops appending blocks, the timestamp of their last block is public. You can see exactly when a chain went silent — and correlate it with events. Glory Chain makes institutional silence legible in a way that press releases and website updates never could.

**No account required to read.**
Public chains are readable by anyone, instantly, with no sign-up, no cookies, no tracking. Verification doesn't require contacting any server — the math works locally. The chain is the source of truth, not the platform.

**RSS means the open web is your delivery system.**
Every public chain exposes a standard RSS/Atom feed. Subscribe in any reader. Get notified when a new block is appended. The chain is distributed through the same open infrastructure as podcasts and news — not a closed notification system.

---

### `developers` — builders, integrators, OSS contributors

**A protocol, not a platform.**
`@glorychain/core` has zero runtime dependencies. It's pure computation — tree-shakeable, runs in Node, browsers, and Deno. Build tamper-evident record-keeping into any product without taking on infrastructure or a service dependency.

**Typed, predictable, no surprise throws.**
Every operation returns `Result<T, GloryChainError>`. Errors are values. The API surface is small and stable. The connector interface is versioned with documented backwards compatibility guarantees. Build on it with confidence.

**One hour from zero to a working verified chain.**
`npm install @glorychain/core` → `generateKeypair()` → `createChain()` → `appendBlock()` → `verifyChain()`. That's the entire lifecycle. The conformance suite tells you immediately if your implementation is protocol-compliant.

**A chain created today can be used by connectors that don't exist yet.**
The protocol separates content from persistence. A chain stored today can be read by any future connector that implements the interface. You're not locked into the storage decisions you make on day one.

---

## Use cases

### ⚖️ Civic accountability

A city council publishes every planning decision on-chain. Journalists cite block permalinks in articles — links that are permanent, verifiable, and impossible to quietly update. When the council goes silent, the timestamp of the last block tells its own story.

```
Block 0 — Genesis
  "Westfield Planning Authority — public record of all planning decisions
   from 2026 onwards. Blocks appended after each committee meeting."

Block 1 — 2026-01-15
  "Planning application PA/2026/0042 APPROVED.
   Applicant: Westfield Developments Ltd.
   Decision: Full planning permission granted for 240-unit residential
   development at Former Industrial Site, North Quarter.
   Committee vote: 6 for, 2 against, 1 abstention."
```

### 🏛️ NGO governance

A non-profit board publishes all major governance decisions on a public chain. Donors and partners can verify the organisation's stated positions at any point in time without trusting a press release.

```
Block 0 — Genesis
  "Acme Aid Foundation — Board Decision Register.
   All decisions of the board of directors are recorded here.
   Signatories: Executive Director + Board Chair.
   This record is public, permanent, and cryptographically verified."

Block 1 — 2026-01-20
  "BOARD RESOLUTION 2026-001: Approved annual operating budget of
   $2,400,000 for fiscal year 2026.
   Breakdown: Programs 68%, Operations 22%, Fundraising 10%.
   Vote: Unanimous (9/9 directors present)."
```

### 🔧 Open source project decisions

A project maintainer chains every major architectural decision — the kind that would otherwise live in Slack and be forgotten. Contributors can read the full history of *why* the project is the way it is.

```
Block 0 — Genesis
  "hyperdb — Architecture Decision Register.
   Every decision that shapes this project's architecture lives here.
   Written by the core maintainers. Permanent and attributable."

Block 1 — 2025-09-12
  "ADR-001: Chose RocksDB over LevelDB as the default storage engine.
   Reasoning: RocksDB's column families give us the isolation guarantees
   we need for transaction logs without a separate process.
   Considered: LevelDB, LMDB, SQLite.
   Rejected LevelDB: no column family support.
   Rejected LMDB: copy-on-write semantics complicate our write path."
```


### 📋 Policy commitment tracking

Advocacy groups demand that politicians and institutions create public chains for specific commitments. The chain is either updated — or the silence is evidence.

```
Block 0 — Genesis
  "Senator [Name] — Climate Commitment Register.
   I am creating this public chain to document my climate policy
   commitments and actions taken. Each vote, each statement, each
   decision. Permanently on record."

Block 1 — 2026-01-28
  "Voted YES on the Clean Energy Transition Act (Senate Bill 412).
   Bill passed 52-48. My floor statement is in the Congressional
   Record at 2026-01-28T14:32:00Z."
```

### 🖥️ Developer audit trails

Automated systems append blocks for significant state changes — deployments, configuration changes, access grants. The chain provides an audit log nobody can quietly edit after the fact.

```
Block 0 — Genesis
  "production-api — Infrastructure Change Register.
   Automated audit trail for all production deployments, config
   changes, and access permission changes.
   Operator: platform-engineering@company.com"

Block 1 — 2026-03-22T09:14:33Z
  "DEPLOY: production-api v2.14.1
   Commit: abc1234 — 'fix: correct rate limit calculation for enterprise tier'
   Deployed by: ci-bot (triggered by: jane.smith@company.com)
   Previous version: v2.14.0
   Rollback: glorychain append --content 'ROLLBACK to v2.14.0' ..."
```

---

## ⚡️ Getting started

**Prerequisites:** Node 18+, pnpm 10+

```bash
pnpm install
pnpm turbo build
```

### `pnpm turbo test`

```bash
pnpm turbo test
```

### `glorychain` CLI

#### `keygen`

```bash
pnpm --filter @glorychain/cli exec glorychain keygen
```

#### `create`

```bash
pnpm --filter @glorychain/cli exec glorychain create \
  --name "My Organisation Decisions" \
  --purpose "Public record of all governance decisions" \
  --key <privateKey>
```

#### `append`

```bash
pnpm --filter @glorychain/cli exec glorychain append \
  --chain <chainId> \
  --content "Approved new board member: Jane Smith (2026-03-22)" \
  --key <privateKey>
```

#### `verify`

```bash
pnpm --filter @glorychain/cli exec glorychain verify --chain <chainId>
```

### `apps/web`

```bash
cd apps/web
cp .env.example .env.local   # fill in secrets
pnpm dev
```

---

## Key design decisions

**Ed25519 signatures** — fast, small, well-audited. SPKI/PKCS8 DER, base64url encoded.

**SHA-256 hash chaining** — each block commits to its predecessor. A single modified byte cascades as a broken hash.

**Zero runtime dependencies in core** — `@glorychain/core` is pure ESM computation. No I/O, no network, no Node built-ins. Works in Node, browsers, and Deno.

**Connector interface** — a versioned public API contract. Any persistence target (filesystem, GitHub, IPFS, S3) can be supported by any third party. Businesses can safely build on top of it.

**Fork model** — compromise doesn't destroy a chain, it creates visible lineage. Any observer can fork from any block. A chain that has never been forked carries implicit community endorsement.

**RSS-native** — every chain exposes a standard RSS/Atom feed. The open web archives public chains passively.

**Result<T, E> — no thrown errors** — every operation returns a typed Result. Errors are values, not surprises.

---

## Protocol spec

The full protocol specification — block schema, hash construction, signature format, connector interface contract, conformance requirements — lives in [`packages/core`][core_readme].

A chain created today can be reinterpreted by a connector that doesn't exist yet. **Future utility without future-proofing.**

---

## Monorepo structure

```
glorychain/
├── packages/
│   ├── core/        @glorychain/core    — protocol library
│   ├── fs/          @glorychain/fs      — file system connector
│   ├── github/      @glorychain/github  — GitHub connector + scaffolding
│   └── shared/      @glorychain/shared  — Zod validators, shared types
├── apps/
│   ├── cli/         glorychain CLI      — local chain management
│   └── conformance/ conformance CLI     — protocol compliance testing

glorychain-saas/               ← separate repo
└── Next.js SaaS platform
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The conformance suite in `apps/conformance` is the canonical way to verify a new implementation.

---

## Licence

[MIT][license_url]

<!-- Badges -->
[license_img]: https://img.shields.io/badge/license-MIT-blue?style=for-the-badge
[license_url]: ./LICENSE
[ts_img]: https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[ts_url]: https://www.typescriptlang.org/
[node_img]: https://img.shields.io/badge/Node-18+-339933?style=for-the-badge&logo=node.js&logoColor=white
[node_url]: https://nodejs.org/
[pnpm_img]: https://img.shields.io/badge/pnpm-10+-F69220?style=for-the-badge&logo=pnpm&logoColor=white
[pnpm_url]: https://pnpm.io/

<!-- Package links -->
[core_url]: packages/core
[core_readme]: packages/core/README.md
[fs_url]: packages/fs
[fs_readme]: packages/fs/README.md
[github_url]: packages/github
[github_readme]: packages/github/README.md
[shared_url]: packages/shared
[shared_readme]: packages/shared/README.md
[cli_url]: apps/cli
[cli_readme]: apps/cli/README.md
[conformance_url]: apps/conformance
[conformance_readme]: apps/conformance/README.md
[saas_url]: https://github.com/finnfitzsimons3/glorychain-saas
