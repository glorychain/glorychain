<div align="center">

# glorychain

[![CI][ci_img]][ci_url]
[![npm][npm_img]][npm_url]
[![License][license_img]][license_url]

> The tamper-evident event log for applications that need to be trusted.

</div>

---

Your logs can be deleted. Your audit trail shouldn't be.

Glorychain is a tamper-evident, cryptographically signed event log — the useful part of blockchain, without the network, the tokens, or the ops burden. Every block is Ed25519-signed and SHA-256 hash-linked to the one before it. Modify any block and every subsequent hash breaks — tampering is mathematically detectable by anyone with a copy of the chain.

Think of it as **Git for your application's events**: append-only history, full replay, independently verifiable. Store it wherever you already store things — files, S3, Postgres, GitHub.

**The platform is a notary, not a judge.**

---

## Install

```bash
npm install -g glorychain
```

```bash
glorychain keygen
glorychain create --key <key> --pubkey <pubkey> --content "My governance register"
glorychain append --chain <id> --key <key> --pubkey <pubkey> --content "Resolution passed."
glorychain verify --chain <id>
```

---

## Packages

| Package | Version | Description |
|---|---|---|
| [`@glorychain/core`](packages/core) | [![core][core_img]][core_url] | Protocol — chain lifecycle, crypto, verification |
| [`@glorychain/structures`](packages/structures) | [![structures][structures_img]][structures_url] | Stateful structures — OrgTree, KeyValueStore, VoteRegister, and more |
| [`@glorychain/fs`](packages/fs) | [![fs][fs_img]][fs_url] | Filesystem connector |
| [`@glorychain/s3`](packages/s3) | [![s3][s3_img]][s3_url] | S3 connector — AWS, Cloudflare R2, MinIO, Backblaze |
| [`@glorychain/postgres`](packages/postgres) | [![pg][pg_img]][pg_url] | PostgreSQL connector — Postgres, Supabase, Neon |
| [`@glorychain/github`](packages/github) | [![gh][gh_img]][gh_url] | GitHub connector + tamper detection |
| [`@glorychain/shared`](packages/shared) | [![shared][shared_img]][shared_url] | Zod validators + shared types |
| [`glorychain` CLI](apps/cli) | [![cli][cli_img]][cli_url] | Full lifecycle management from the terminal |
| [Conformance suite](apps/conformance) | — | Protocol compliance testing |

---

## Documentation

[Why glorychain](docs/why-glorychain.md) · [Quickstart](docs/quickstart.md) · [Use cases](docs/use-cases.md) · [Docs](docs/index.md)

---

## Get involved

glorychain is an open protocol built in public. All contributions welcome — code, docs, use cases, ideas.

[Roadmap](ROADMAP.md) · [Contributing](CONTRIBUTING.md) · [Discussions](https://github.com/finnfitzsimons3/glorychain/discussions) · [MIT][license_url]

<!-- Badges -->
[ci_img]: https://img.shields.io/github/actions/workflow/status/finnfitzsimons3/glorychain/ci.yml?branch=main&label=CI&style=for-the-badge
[ci_url]: https://github.com/finnfitzsimons3/glorychain/actions/workflows/ci.yml
[npm_img]: https://img.shields.io/npm/v/glorychain?style=for-the-badge&label=npm
[npm_url]: https://www.npmjs.com/package/glorychain
[license_img]: https://img.shields.io/badge/license-MIT-blue?style=for-the-badge
[license_url]: ./LICENSE
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
[s3_img]: https://img.shields.io/npm/v/@glorychain/s3?label=%20&style=flat-square
[s3_url]: https://www.npmjs.com/package/@glorychain/s3
[pg_img]: https://img.shields.io/npm/v/@glorychain/postgres?label=%20&style=flat-square
[pg_url]: https://www.npmjs.com/package/@glorychain/postgres
