# Contributing to glorychain

glorychain is an open protocol. Contributions to the core library, CLI, connectors, conformance suite, and documentation are all welcome.

---

## Getting started

**Prerequisites:** Node 18+, pnpm 10+

```bash
git clone https://github.com/finnfitzsimons3/glorychain
cd glorychain
pnpm install
pnpm build
pnpm test
```

---

## Repo structure

```
packages/core        @glorychain/core    — protocol library (chain lifecycle, crypto, verification)
packages/shared      @glorychain/shared  — Zod validators + shared types
packages/fs          @glorychain/fs      — filesystem connector
packages/github      @glorychain/github  — GitHub connector
apps/cli             glorychain          — CLI (11 commands)
apps/conformance                         — protocol compliance test suite
```

---

## Development workflow

```bash
pnpm build          # build all packages
pnpm test           # run all tests
pnpm lint           # Biome lint
pnpm typecheck      # TypeScript type checking
pnpm format         # auto-format with Biome
```

Run a single package:

```bash
pnpm --filter @glorychain/core build
pnpm --filter @glorychain/core test
```

---

## Making changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Ensure `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm typecheck` all pass
4. If you changed the protocol or any public API, add a changeset:
   ```bash
   pnpm changeset
   ```
5. Open a PR — fill in the template

---

## Protocol changes

Changes to the core protocol (block structure, hash scheme, verification rules, signing) carry extra weight. Every existing chain and every third-party implementation is affected.

For protocol changes:
- Open an issue first using the **Protocol extension proposal** template
- Discuss before implementing
- All protocol changes must pass the full conformance suite
- Breaking changes require a major version bump

---

## Writing a connector

A connector implements the `Connector` interface from `@glorychain/core`:

```ts
interface Connector {
  read(chainId: string): Promise<Chain>
  write(chain: Chain): Promise<void>
  list(): Promise<string[]>
}
```

See `packages/fs` for a minimal reference implementation.

---

## Conformance suite

If you change the protocol or core verification logic, run the full conformance suite:

```bash
pnpm --filter @glorychain/conformance start
```

Output is TAP-compatible. All tests must pass before merging.

---

## Commit style

We don't enforce a strict format, but be descriptive. Reference issue numbers where relevant (`fixes #42`).

---

## Releasing

Releases are managed with [Changesets](https://github.com/changesets/changesets). The release workflow creates a version PR automatically when changesets are present on `main`. Merging that PR publishes to npm.

---

## Questions?

Open a [discussion](https://github.com/finnfitzsimons3/glorychain/discussions) or file an issue.
