# glorychain examples

Runnable examples showing how to use every module. Each example is a self-contained TypeScript script.

## Prerequisites

```bash
pnpm install
pnpm build
```

## Run an example

```bash
npx tsx examples/01-core-basics/index.ts
npx tsx examples/02-key-value-store/index.ts
npx tsx examples/04-org-tree/index.ts
# etc.
```

## Examples

| Example | What it covers |
|---|---|
| [01-core-basics](./01-core-basics/) | Keypair generation, create chain, append blocks, verify |
| [02-key-value-store](./02-key-value-store/) | Production config audit log — SET, DELETE, query |
| [03-member-set](./03-member-set/) | Team membership register — join, role change, leave |
| [04-org-tree](./04-org-tree/) | Engineering org structure — appoint, promote, query subtree |
| [05-vote-register](./05-vote-register/) | Governance motions — open, cast votes, close, tally |
| [06-decision-log](./06-decision-log/) | Board resolutions — record, supersede, annotate |
| [07-timeline](./07-timeline/) | Incident + milestone timeline — entries, tags, retract |
| [08-document-register](./08-document-register/) | Policy document versioning — publish, supersede, withdraw |
| [09-access-list](./09-access-list/) | API access control — grant, revoke, expiry |
| [10-changelog](./10-changelog/) | Release register — release, deprecate, yank |
