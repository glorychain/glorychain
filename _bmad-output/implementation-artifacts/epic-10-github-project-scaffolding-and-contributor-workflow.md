# Epic 10 — GitHub Project Scaffolding & Contributor Workflow

**Epic ID:** 10
**Status:** backlog
**Created:** 2026-03-22
**MVP:** 1 (closes the gap between "library works" and "users can actually run a project")

---

## Background and Motivation

Epics 1–5 deliver a working protocol library, CLI, and GitHub connector. What they do not deliver is any answer to: *"I have a GitHub repo. How do I turn it into a glory-chain project that other people can contribute to?"*

A user who runs `glory-chain create` ends up with a signed JSON file but no:
- Directory structure convention
- GitHub Actions CI to verify chains on every PR
- PR/issue templates so contributors know how to submit blocks
- Charter document explaining what the chain is *for* and what submissions are accepted

**Key design principle:** Submission guidelines, governance rules, and chain purpose are **chain-level concerns**, not scaffold-level concerns. They belong in the chain itself — either as the genesis block's content, or in a `CHAIN_CHARTER.md` file that the genesis block's content references. The scaffold templates are intentionally generic; they point contributors to the charter rather than embed policy.

This means `glory-chain init` can optionally create the first chain (the charter chain) whose genesis block content *is* the governance policy. The chain itself becomes the authoritative, tamper-evident record of the rules — not a separate doc that can be edited without trace.

---

## Stories

---

### Story 10.1 — `glory-chain init`: Repo scaffold command

**Story ID:** 10.1
**Key:** `10-1-init-command`
**Status:** backlog

#### Story

As a developer setting up a glory-chain project on GitHub, I want to run `glory-chain init --owner <owner> --repo <repo> --token <token>` so that my repository is scaffolded with the correct directory structure, GitHub Actions CI, and a local config — without touching the GitHub web UI.

#### Acceptance Criteria

**AC-1: Directory structure**
Creates `chains/.gitkeep` and `adr/.gitkeep` in the target repo via the GitHub Contents API (PUT with base64 content `Cg==` — a single newline). Uses the same PUT-with-SHA upsert pattern as `GitHubConnector.write()`.

**AC-2: Local config**
Writes `.glory-chain/config.json` with `{ "connector": "github", "chainIds": [] }` using the existing `writeConfig()` utility.

**AC-3: Skip-if-exists**
For every target file, GETs the path first. If it exists (200 + `sha`), outputs `skipped: <path>` and moves on. Never overwrites. Fail-at-end (not fail-fast) if any write errors — attempt all files before exiting non-zero.

**AC-4: Options**
Accepts `--branch <branch>` (default `main`), `--dir <dir>` (default `chains`), `--json` for machine-readable output. All options consistent with `GitHubConnectorConfig`.

**AC-5: Output format**
Human mode: `created: <path>` / `skipped: <path>` lines. JSON mode: `{ "action": "created"|"skipped", "path": "..." }` newline-delimited objects.

**AC-6: Charter prompt**
After scaffolding, prints a human-readable prompt (not an error, not JSON) suggesting the user run `glory-chain init --charter` or `glory-chain create` to bootstrap their charter chain. This is informational only.

#### File List

- `packages/github/src/scaffold.ts` (new) — `scaffoldRepo(config, opts): Promise<ScaffoldResult[]>`; encapsulates all GitHub API writes for arbitrary paths; template content injected by callers in Stories 10.2–10.4
- `packages/github/src/index.ts` (updated) — re-export `scaffoldRepo`, `ScaffoldOptions`, `ScaffoldResult`
- `apps/cli/src/commands/init.ts` (new) — `makeInitCommand()` factory; thin commander wrapper over `scaffoldRepo()`; calls `writeConfig()` after
- `apps/cli/src/index.ts` (updated) — register `makeInitCommand()`
- `apps/cli/package.json` (updated) — add `"@glory-chain/github": "workspace:*"` to dependencies

---

### Story 10.2 — GitHub Actions workflow: chain verification on PR

**Story ID:** 10.2
**Key:** `10-2-verify-workflow-template`
**Status:** backlog

#### Story

As a repo maintainer, I want `glory-chain init` to write a `.github/workflows/glory-chain-verify.yml` to my repo so that any PR touching `chains/**` automatically runs `glory-chain verify` and blocks merge if any chain fails — with no manual YAML authoring.

#### Acceptance Criteria

**AC-1: Workflow written by init**
`scaffoldRepo()` includes `.github/workflows/glory-chain-verify.yml` in its file list. Obeys skip-if-exists.

**AC-2: Trigger**
Triggers on `pull_request` with `paths: ['<dir>/**']` where `<dir>` comes from `ScaffoldOptions.dir` (default `chains`).

**AC-3: Verification step**
Job loops over `<dir>/*.json`, derives chain ID by stripping path and `.json`, and runs `npx --yes glory-chain@latest verify --chain <id> --dir <dir>`. Uses `bash` with `nullglob` or an existence check so zero files does not error.

**AC-4: Self-contained**
Uses `actions/checkout@v4` with `fetch-depth: 0`. No `npm install` step — `npx` handles it.

**AC-5: Concurrency**
Includes `concurrency: { group: "glory-chain-verify-${{ github.ref }}", cancel-in-progress: true }`.

**AC-6: Static template**
Workflow YAML is a static string constant in `packages/github/src/templates/verify-workflow.ts`, with `dir` and `branch` interpolated via template literal. No YAML library dependency.

#### File List

- `packages/github/src/templates/verify-workflow.ts` (new) — `verifyWorkflowYaml(opts: { dir: string; branch: string }): string`
- `packages/github/src/scaffold.ts` (updated) — import and call `verifyWorkflowYaml()`

---

### Story 10.3 — PR and issue templates for block/ADR submissions

**Story ID:** 10.3
**Key:** `10-3-pr-and-issue-templates`
**Status:** backlog

#### Story

As a contributor to a glory-chain repo, I want structured PR and issue templates so I know what information to provide when submitting a new block or ADR — and so the maintainer can evaluate submissions consistently.

#### Design Note — Generic by Default, Charter-Driven by Policy

The templates are intentionally **generic**. They teach the mechanics (what commands to run, what files to create). They do **not** define what blocks are acceptable, who may submit, or what content is required — that is the chain owner's responsibility and lives in the genesis block or `CHAIN_CHARTER.md`.

Every template includes a prominent line:

> **See the genesis block or `CHAIN_CHARTER.md` for submission guidelines specific to this chain.**

#### Acceptance Criteria

**AC-1: Three files written by init**
`scaffoldRepo()` writes: `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/block-submission.yml`, `.github/ISSUE_TEMPLATE/adr-submission.yml`. All obey skip-if-exists.

**AC-2: PR template content**
Prompts for: chain ID, summary of block content, confirmation that `glory-chain verify` passed locally, block number (if known). Includes a bolded note pointing to the genesis block / `CHAIN_CHARTER.md` for project-specific acceptance criteria.

**AC-3: Block issue template**
GitHub YAML issue template format (`name`, `about`, `labels: [block-submission]`, `body` with `textarea` fields). Fields: chain ID, proposed content, submitter public key (base64url), link to relevant context. Includes `description` field: *"For acceptance criteria, see the genesis block or CHAIN_CHARTER.md."*

**AC-4: ADR issue template**
GitHub YAML issue template format. Fields: ADR title, context, decision, consequences, target chain ID (optional). `description`: *"ADR file should be saved as `adr/YYYY-MM-DD-<title>.md` and referenced in the block content."*

**AC-5: Labels note**
Templates include a comment noting that `block-submission` and `adr` labels must be created manually in the repo — the Contents API cannot create labels.

**AC-6: Static templates**
All content is static string constants with no runtime dependencies.

#### File List

- `packages/github/src/templates/pr-template.ts` (new)
- `packages/github/src/templates/block-issue-template.ts` (new)
- `packages/github/src/templates/adr-issue-template.ts` (new)
- `packages/github/src/scaffold.ts` (updated)

#### Note on issue template format
Use GitHub's newer YAML issue template format (`.yml` extension, `body:` with typed inputs) rather than plain Markdown templates — it provides structured fields and validation in the GitHub UI. The `body` field uses `type: textarea` for free-form fields and `type: input` for short fields like chain ID.

---

### Story 10.4 — `CHAIN_CHARTER.md` template and `CONTRIBUTING.md`

**Story ID:** 10.4
**Key:** `10-4-charter-and-contributing`
**Status:** backlog

#### Story

As a chain owner setting up a new glory-chain project, I want `glory-chain init` to write a `CHAIN_CHARTER.md` template and a `CONTRIBUTING.md` so that contributors understand both the mechanics of participation and the governance rules I've defined for this specific chain.

#### Design Note — Charter as the Source of Truth

`CHAIN_CHARTER.md` is a **template the owner fills in**. Once filled in, its content (or a hash of it) should be included in the genesis block — making it tamper-evident. The `glory-chain init` flow ends with an explicit prompt:

> *"Fill in `CHAIN_CHARTER.md` with your chain's purpose and governance rules, then run:*
> `glory-chain create --key <key> --pubkey <pubkey> --content "$(cat CHAIN_CHARTER.md)"` *to anchor it to your chain's genesis block."*

This makes the charter part of the chain, not just a repo file. The `CONTRIBUTING.md` references the charter file for all policy questions and only documents mechanics.

#### Acceptance Criteria

**AC-1: `CHAIN_CHARTER.md` written by init**
A template file with clearly marked `<!-- TODO -->` sections: Purpose, Scope (what topics/decisions this chain covers), Submission Criteria (who may submit, what format), Reviewer Criteria (what makes a block acceptable for merge), and Governance (how disputes are resolved). Obeys skip-if-exists.

**AC-2: Charter-to-genesis prompt**
After scaffolding completes, `glory-chain init` prints (human mode only, not JSON) an explicit next-steps block explaining how to embed the filled charter into the genesis block using `glory-chain create`.

**AC-3: `CONTRIBUTING.md` written by init**
Documents: directory structure (`chains/`, `adr/`, `.github/`), the full block submission flow as numbered shell commands using `npx glory-chain`, the ADR file naming convention (`adr/YYYY-MM-DD-<title>.md`), verification (how CI works, what exit codes mean). All example commands use `npx glory-chain@latest` — not a globally installed binary. Obeys skip-if-exists.

**AC-4: Policy delegation**
`CONTRIBUTING.md` explicitly does **not** define submission criteria, accepted content types, or governance rules. It contains a single prominent section: *"## Submission Guidelines"* with one line: *"See `CHAIN_CHARTER.md` (and the genesis block) for submission guidelines, acceptance criteria, and governance rules for this chain."*

**AC-5: Charter interpolation**
`CHAIN_CHARTER.md` template accepts `dir` from `ScaffoldOptions` so examples reference the correct chains directory. `CONTRIBUTING.md` template accepts `dir` and `branch` for the same reason.

**AC-6: Static templates**
All content is static strings. `CONTRIBUTING.md` imports `CUSTODY_WARNING` from `@glory-chain/core` to embed the literal warning in the keygen section (since `@glory-chain/github` already depends on `@glory-chain/core`).

#### File List

- `packages/github/src/templates/chain-charter.ts` (new) — `chainCharterMarkdown(opts: { dir: string }): string`
- `packages/github/src/templates/contributing.ts` (new) — `contributingMarkdown(opts: { dir: string; branch: string }): string`
- `packages/github/src/scaffold.ts` (updated)

---

### Story 10.5 — `glory-chain template`: block and ADR content stub generator

**Story ID:** 10.5
**Key:** `10-5-template-command`
**Status:** backlog

#### Story

As a contributor preparing a block or ADR, I want to run `glory-chain template --type block` or `glory-chain template --type adr --title "Adopt Ed25519"` to get a formatted content stub I can fill in and pass to `glory-chain append` — so I don't have to know the expected format from memory.

#### Design Note — Template as Convention, Not Constraint

The stub format produced by `glory-chain template` is a **convention**, not a protocol requirement. The glory-chain protocol accepts any string as block content. The template command exists to encourage consistent, readable block content across contributors — but it is not enforced by the chain or verifier.

The `CHAIN_CHARTER.md` (Story 10.4) is where a chain owner can document whether they require a specific content format (e.g. "all blocks must be ADR format") or allow freeform content.

#### Acceptance Criteria

**AC-1: Block stub**
`glory-chain template --type block` prints a Markdown stub: `# Block — YYYY-MM-DD`, `## Summary`, `## References`. Date from `new Date().toISOString().slice(0, 10)`. Ends with a tip comment pointing to `CHAIN_CHARTER.md` for required content format.

**AC-2: ADR stub**
`glory-chain template --type adr --title <title>` prints: `# ADR: <title>`, `## Status: Proposed`, `## Context`, `## Decision`, `## Consequences`, `## Chain Reference` (placeholder: `Block appended to chain: <chain-id>, block number: <n>`). `--title` required for ADR type.

**AC-3: `--out <file>` flag**
Writes to filesystem path instead of stdout. Uses `node:fs/promises` `writeFile` — same pattern as `export.ts`.

**AC-4: JSON mode**
`--json` emits `{ "type": "block"|"adr", "content": "<markdown>" }` via `printJson()`.

**AC-5: Validation**
`--type adr` without `--title` exits 1 with `printError("--title is required for ADR templates")`.

**AC-6: `--type` constrained**
Uses commander `.choices(["block", "adr"])`. No dependency on `@glory-chain/github` — all content generation is inline in the CLI command.

#### File List

- `apps/cli/src/commands/template.ts` (new)
- `apps/cli/src/index.ts` (updated)

---

## Full Scaffold Output (after all stories)

| Path written to target repo | Story | Skip if exists |
|---|---|---|
| `chains/.gitkeep` | 10.1 | yes |
| `adr/.gitkeep` | 10.1 | yes |
| `.github/CODEOWNERS` | 10.1 | yes |
| `README.md` | 10.1 | yes — never overwrite |
| `.github/workflows/glory-chain-verify.yml` | 10.2 | yes |
| `.github/pull_request_template.md` | 10.3 | yes |
| `.github/ISSUE_TEMPLATE/block-submission.yml` | 10.3 | yes |
| `.github/ISSUE_TEMPLATE/adr-submission.yml` | 10.3 | yes |
| `CHAIN_CHARTER.md` | 10.4 | yes — fill in and embed in genesis |
| `CONTRIBUTING.md` | 10.4 | yes |

---

## Implementation Order

```
10.1 (scaffold.ts skeleton + init command)
  ├── 10.2 (verify-workflow.ts → scaffold.ts)
  ├── 10.3 (pr-template.ts, block/adr issue templates → scaffold.ts)
  └── 10.4 (chain-charter.ts, contributing.ts → scaffold.ts)

10.5 (template command — CLI only, independent)
```

Stories 10.2–10.4 are parallel once 10.1 is done. Story 10.5 is fully independent.

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Notes
- Genesis-block-as-charter design: submission guidelines live in the chain, not the scaffold
- All templates are generic; chain owners define policy in CHAIN_CHARTER.md + genesis block
- `CONTRIBUTING.md` explicitly delegates all policy questions to the charter
- Issue templates use GitHub YAML format (not legacy Markdown format) for structured fields
