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

Releases are managed with [Changesets](https://github.com/changesets/changesets) and triggered automatically by CI.

### How it works

1. **During development** — whenever a PR changes a public API, the author adds a changeset describing the change and its semver impact:
   ```bash
   pnpm changeset
   # Select affected packages, choose patch/minor/major, write a summary
   # This creates a file in .changeset/ — commit it with your PR
   ```

2. **On merge to `main`** — the [release workflow](.github/workflows/release.yml) runs. It detects any `.changeset/` files and opens (or updates) a **Version PR** titled `chore: release packages`. This PR:
   - Bumps the version in each affected `package.json`
   - Updates `CHANGELOG.md` for each package
   - Consumes (deletes) the changeset files

3. **To publish** — merge the Version PR. The same workflow detects that changesets have been consumed and runs `pnpm release`, which builds all packages and publishes them to npm.

### Semver guide

| Change | Bump |
|---|---|
| Bug fix, internal change | `patch` |
| New public API (backwards compatible) | `minor` |
| Protocol change, breaking API change | `major` |

### Prerequisites for publishing

- `NPM_TOKEN` secret must be set in the repo (Settings → Secrets → Actions)
- The token must have publish access to the `@glorychain` npm scope

### Manual release (maintainers only)

If CI is unavailable:

```bash
pnpm install
pnpm build
pnpm changeset version   # bump versions + update changelogs
git add . && git commit -m "chore: release packages"
pnpm changeset publish   # publish to npm
git push --follow-tags
```

---

## Questions?

Open a [discussion](https://github.com/finnfitzsimons3/glorychain/discussions) or file an issue.
