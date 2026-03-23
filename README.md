<div align="center">

# glorychain

[![License][license_img]][license_url]
[![TypeScript][ts_img]][ts_url]
[![Node][node_img]][node_url]
[![pnpm][pnpm_img]][pnpm_url]

> An open protocol for verifiable institutional truth.

Immutable, cryptographically signed chains of records. Every block tamper-evident. Every block permanently attributable. No silent edits. No deletions.

**The platform is a notary, not a judge.**

</div>

---

## Packages

| Package | Description |
|---------|-------------|
| [`@glorychain/core`](packages/core) | Protocol — chain lifecycle, crypto, verification |
| [`@glorychain/fs`](packages/fs) | File system connector |
| [`@glorychain/github`](packages/github) | GitHub connector + repo scaffolding |
| [`@glorychain/shared`](packages/shared) | Zod validators + shared types |
| [`glorychain` CLI](apps/cli) | Full lifecycle management from the terminal |
| [Conformance suite](apps/conformance) | Protocol compliance testing |

---

## Use cases

### ⚖️ Civic accountability — `westfield-planning-authority`
```
Block 0  "Public record of all planning decisions from 2026 onwards."
Block 1  "PA/2026/0042 APPROVED. 240-unit residential, North Quarter. Vote: 6–2–1."
Block 2  "PA/2026/0091 REFUSED. Change of use, High Street. Vote: 7–0–2."
```

### 🏛️ NGO governance — `acme-aid-board-decisions`
```
Block 0  "Board Decision Register. Signatories: Executive Director + Board Chair."
Block 1  "RESOLUTION 2026-001: Annual budget $2.4M approved. Unanimous (9/9)."
Block 2  "RESOLUTION 2026-002: New safeguarding policy adopted. Vote: 8–1."
```

### 🔧 OSS architecture — `hyperdb-adr`
```
Block 0  "Architecture Decision Register. Written by core maintainers."
Block 1  "ADR-001: RocksDB over LevelDB. Column families required for tx log isolation."
Block 2  "ADR-002: Single-writer model. Simplifies conflict resolution at the protocol layer."
```

### 📋 Policy commitments — `senator-name-climate-register`
```
Block 0  "I am creating this chain to document my climate commitments. Permanently on record."
Block 1  "Voted YES on Clean Energy Transition Act (SB-412). Passed 52–48."
```

### 🏢 Org hierarchy — `acme-corp-members`
```
Block 0  "Canonical membership and reporting structure for Acme Corp."
Block 1  "APPOINT: Sarah Chen → Chief Executive Officer."
Block 2  "APPOINT: James Okafor → VP Engineering, reports to: Sarah Chen."
Block 3  "APPOINT: Liu Wei → Staff Engineer, reports to: James Okafor."
Block 4  "PROMOTE: Liu Wei → Principal Engineer."
Block 5  "DEPART: James Okafor. Direct reports reassigned to: Sarah Chen (interim)."
```

### 🖥️ Audit trails — `production-api-infra`
```
Block 0  "Automated audit trail for all production deployments and config changes."
Block 1  "DEPLOY v2.14.1 — fix: rate limit calculation. Triggered by: jane.smith@company.com"
Block 2  "CONFIG: rate_limit_multiplier 1.0 → 1.5. Approved by: oncall-lead@company.com"
```

---

## Getting started

```bash
npm i -g @glorychain/cli
```

```bash
glorychain keygen
glorychain create --name "My Org" --purpose "Governance decisions" --key <key>
glorychain append --chain <id> --content "Board approved X" --key <key>
glorychain verify --chain <id>
```

---

## How it works

Ed25519 keypair → genesis block → append signed blocks → SHA-256 hash chaining → anyone can verify locally.

```
Genesis ──► Block 1 ──► Block 2 ──► Block 3
  hash ────────► hash ────────► hash ────────► hash
```

Modify any block → every subsequent hash breaks. **Tampering is mathematically detectable.**

---

## Structure

```
packages/core        @glorychain/core    — protocol library
packages/fs          @glorychain/fs      — filesystem connector
packages/github      @glorychain/github  — GitHub connector
packages/shared      @glorychain/shared  — types + validators
apps/cli             glorychain          — CLI
apps/conformance                         — compliance testing
```

---

[Contributing](CONTRIBUTING.md) · [MIT][license_url]

<!-- Badges -->
[license_img]: https://img.shields.io/badge/license-MIT-blue?style=for-the-badge
[license_url]: ./LICENSE
[ts_img]: https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[ts_url]: https://www.typescriptlang.org/
[node_img]: https://img.shields.io/badge/Node-18+-339933?style=for-the-badge&logo=node.js&logoColor=white
[node_url]: https://nodejs.org/
[pnpm_img]: https://img.shields.io/badge/pnpm-10+-F69220?style=for-the-badge&logo=pnpm&logoColor=white
[pnpm_url]: https://pnpm.io/
[saas_url]: https://github.com/finnfitzsimons3/glorychain-saas
