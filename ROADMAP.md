# Roadmap

glorychain is an early-stage open protocol. This document is public and honest about where things stand.

---

## What exists today

- **Protocol core** — Ed25519 signing, SHA-256 hash chaining, full verification
- **CLI** — 11 commands covering the full chain lifecycle, with `--preset` scaffolding for common chain types
- **Connectors** — filesystem (`@glorychain/fs`), GitHub (`@glorychain/github`), S3/R2/MinIO (`@glorychain/s3`), Postgres (`@glorychain/postgres`)
- **Structures** — 9 ready-to-use stateful data structures in `@glorychain/structures`: OrgTree, KeyValueStore, MemberSet, VoteRegister, DecisionLog, Timeline, DocumentRegister, AccessList, ChangeLog
- **Conformance suite** — protocol compliance testing
- **Schema validation** — optional JSON Schema v7 enforcement on chain content
- **Fork model** — key compromise and governance transition support

---

## What we're building next

### Near term

- [ ] **DID identity support** — bind chains to decentralised identities, not just keypairs
- [ ] **Multi-signer chains** — require M-of-N signatures for appends (NGO boards, governance bodies)
- [ ] **Chain indexing** — search and query across chains
- [ ] **Web viewer** — a read-only browser UI for exploring and verifying chains publicly
- [ ] **More connectors** — IPFS, Arweave

### Medium term

- [ ] **Chain registry** — a public directory of chains (opt-in)
- [ ] **Attestation model** — third-party witnesses can co-sign blocks
- [ ] **Protocol v0.2** — formalise the spec, publish a test vector suite

### Longer term

- [ ] **Governance tooling** — purpose-built UI for civic and NGO use cases
- [ ] **Embeddable widget** — drop a "verified chain" badge on any website
- [ ] **Mobile verification** — verify chain integrity without a terminal

---

## How to help

You don't need to write code to contribute.

**Non-technical contributions are just as valuable:**
- Share a use case — open an issue describing a real-world chain you'd want to create
- Improve documentation — fix unclear language, add examples, translate
- Propose a protocol extension — use the [Protocol extension proposal](/.github/ISSUE_TEMPLATE/protocol_extension.yml) template
- Tell someone about glorychain who should know about it

**Technical contributions:**
- Pick up any issue tagged `good first issue`
- Build a connector for a storage backend you use
- Add conformance test coverage
- Review open PRs

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development guide.

---

## Design principles

These guide every decision about what to build and what to decline:

1. **The protocol is a notary, not a judge** — glorychain records and verifies. It does not adjudicate truth.
2. **Verifiable by anyone, anywhere** — no central authority, no API call required to verify a chain
3. **Append-only is a feature** — the immutability is the point, not a limitation
4. **Boring cryptography** — Ed25519 and SHA-256 are well-understood, widely audited, and proven
5. **Connectors, not custody** — glorychain doesn't hold your data. You choose where chains live.

---

## Protocol stability

The protocol is at `v0.0.1`. The spec is stable enough to build on but may have breaking changes before `v1.0`. We will:
- Announce breaking changes with a major version bump
- Maintain a migration guide for each breaking change
- Keep the conformance suite updated so independent implementations can verify compatibility

---

_Last updated: March 2026. If something here is stale, open an issue._
