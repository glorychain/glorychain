import { CUSTODY_WARNING, migrateChain, verifyChain } from "@glorychain/core";
//#region src/connector.ts
var GitHubConnector = class {
	version = "0.0.1";
	branch;
	dir;
	constructor(config) {
		this.config = config;
		this.branch = config.branch ?? "main";
		this.dir = config.dir ?? "chains";
	}
	filePath(chainId) {
		return `${this.dir}/${chainId}.json`;
	}
	apiBase() {
		return `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents`;
	}
	headers() {
		return {
			Authorization: `Bearer ${this.config.token}`,
			Accept: "application/vnd.github+json",
			"Content-Type": "application/json",
			"X-GitHub-Api-Version": "2022-11-28"
		};
	}
	async read(chainId) {
		const url = `${this.apiBase()}/${this.filePath(chainId)}?ref=${this.branch}`;
		const res = await fetch(url, { headers: this.headers() });
		if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
		const data = await res.json();
		const decoded = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
		return JSON.parse(decoded);
	}
	async write(chain) {
		const path = this.filePath(chain.metadata.chainId);
		const url = `${this.apiBase()}/${path}`;
		const content = Buffer.from(JSON.stringify(chain, null, 2), "utf8").toString("base64");
		let sha;
		const existing = await fetch(`${url}?ref=${this.branch}`, { headers: this.headers() });
		if (existing.ok) sha = (await existing.json()).sha;
		const body = {
			message: `glorychain: upsert chain ${chain.metadata.chainId}`,
			content,
			branch: this.branch,
			...sha !== void 0 && { sha }
		};
		const res = await fetch(url, {
			method: "PUT",
			headers: this.headers(),
			body: JSON.stringify(body)
		});
		if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
	}
	async *watch(chainId) {
		const filePath = this.filePath(chainId);
		const url = `${this.apiBase()}/${filePath}?ref=${this.branch}`;
		let lastHash = null;
		const pollMs = this.config.pollIntervalMs ?? 3e4;
		while (true) {
			try {
				const res = await fetch(url, { headers: this.headers() });
				if (res.status === 404) {
					yield {
						type: "FILE_MISSING",
						chainId,
						timestamp: (/* @__PURE__ */ new Date()).toISOString(),
						detail: filePath
					};
					lastHash = null;
				} else if (!res.ok) yield {
					type: "UNEXPECTED_ERROR",
					chainId,
					timestamp: (/* @__PURE__ */ new Date()).toISOString(),
					detail: `HTTP ${res.status}`
				};
				else {
					const currentHash = (await res.json()).sha;
					if (lastHash === null) lastHash = currentHash;
					else if (currentHash !== lastHash) {
						lastHash = currentHash;
						yield {
							type: "FILE_MODIFIED",
							chainId,
							timestamp: (/* @__PURE__ */ new Date()).toISOString(),
							detail: filePath
						};
					}
				}
			} catch (err) {
				yield {
					type: "UNEXPECTED_ERROR",
					chainId,
					timestamp: (/* @__PURE__ */ new Date()).toISOString(),
					detail: String(err)
				};
			}
			await new Promise((resolve) => setTimeout(resolve, pollMs));
		}
	}
	async migrate(chainId, target) {
		const updated = migrateChain(await this.read(chainId), "github", target.version);
		await target.write(updated);
	}
	async verify(chainId) {
		return verifyChain(await this.read(chainId));
	}
};
//#endregion
//#region src/pages.ts
function getPagesUrl(config, chainId) {
	const dir = config.dir ?? "chains";
	return `https://${config.owner}.github.io/${config.repo}/${dir}/${chainId}.json`;
}
//#endregion
//#region src/templates/adr-issue-template.ts
function adrIssueTemplateYaml() {
	return `name: ADR Submission
description: >
  Propose an Architecture Decision Record (ADR) to be recorded on a glorychain.
  For acceptance criteria, see the genesis block or CHAIN_CHARTER.md.
title: "[ADR] "
labels: ["adr"]
# Note: the 'adr' label must be created manually in this repo.
body:
  - type: markdown
    attributes:
      value: |
        **Before submitting**, read [CHAIN_CHARTER.md](../CHAIN_CHARTER.md) (and/or the genesis block)
        for the submission guidelines and acceptance criteria for this chain.

        ADR files should be saved as \`adr/YYYY-MM-DD-<title>.md\` and included in your PR.

  - type: input
    id: title
    attributes:
      label: ADR title
      placeholder: e.g. Adopt Ed25519 for block signing
    validations:
      required: true

  - type: textarea
    id: context
    attributes:
      label: Context
      description: What is the issue or situation that motivates this decision?
    validations:
      required: true

  - type: textarea
    id: decision
    attributes:
      label: Decision
      description: What was decided?
    validations:
      required: true

  - type: textarea
    id: consequences
    attributes:
      label: Consequences
      description: What becomes easier or harder as a result of this decision?
    validations:
      required: true

  - type: input
    id: chain-id
    attributes:
      label: Target chain ID (optional)
      description: The chain this ADR should be appended to, if known.
      placeholder: e.g. abc-123
    validations:
      required: false
`;
}
//#endregion
//#region src/templates/block-issue-template.ts
function blockIssueTemplateYaml() {
	return `name: Block Submission
description: >
  Propose a new block to be appended to a glorychain.
  For acceptance criteria, see the genesis block or CHAIN_CHARTER.md.
title: "[Block] "
labels: ["block-submission"]
# Note: the 'block-submission' label must be created manually in this repo.
body:
  - type: markdown
    attributes:
      value: |
        **Before submitting**, read [CHAIN_CHARTER.md](../CHAIN_CHARTER.md) (and/or the genesis block)
        for the submission guidelines and acceptance criteria for this chain.

  - type: input
    id: chain-id
    attributes:
      label: Chain ID
      description: The ID of the chain you want to append to.
      placeholder: e.g. abc-123
    validations:
      required: true

  - type: textarea
    id: content
    attributes:
      label: Block content
      description: The content of the block. Format requirements are defined in CHAIN_CHARTER.md.
      placeholder: |
        # Block — YYYY-MM-DD
        ## Summary
        ...
    validations:
      required: true

  - type: input
    id: pubkey
    attributes:
      label: Submitter public key (base64url)
      description: Your Ed25519 public key. Run \`npx glorychain@latest keygen\` to generate one.
      placeholder: e.g. MCowBQYDK2VwAyEA...
    validations:
      required: true

  - type: textarea
    id: context
    attributes:
      label: Context / references
      description: Links to issues, PRs, documents, or other context supporting this block.
    validations:
      required: false
`;
}
//#endregion
//#region src/templates/chain-charter.ts
function chainCharterMarkdown(opts) {
	const { dir } = opts;
	return `# Chain Charter

> **This file is a template.** Fill in the sections below, then anchor this charter to your chain's
> genesis block by running:
>
> \`\`\`sh
> npx glorychain@latest create \\
>   --key <your-private-key> \\
>   --pubkey <your-public-key> \\
>   --content "$(cat CHAIN_CHARTER.md)" \\
>   --purpose governance \\
>   --dir ${dir}
> \`\`\`
>
> This makes the charter tamper-evident: any change to this file after genesis can be detected
> by comparing its content to the genesis block.

---

## Purpose

<!-- TODO: What is this chain for? What decisions, records, or events does it capture?
     Example: "This chain records all architectural decisions made by the platform team." -->

## Scope

<!-- TODO: What topics or subject areas are in scope for this chain?
     What is explicitly out of scope?
     Example: "In scope: infrastructure, API design, data model changes.
               Out of scope: day-to-day task tracking, personal notes." -->

## Who May Submit

<!-- TODO: Who is authorised to propose or append blocks?
     Example: "Any member of the @platform-team GitHub org."
     Example: "Anyone — this is a public chain open to all contributors." -->

## Block Format

<!-- TODO: What format must block content follow?
     If freeform, say so. If structured (e.g. ADR format, JSON schema), describe it here.
     Example: "All blocks must be in ADR format (see adr/ directory for examples)."
     Example: "Block content is freeform Markdown." -->

## Acceptance Criteria

<!-- TODO: What makes a submitted block acceptable for merge?
     Example:
     - Block content is factually accurate and clearly written
     - glorychain verify passes on CI
     - At least one maintainer approval on the PR
     - For ADRs: the adr/YYYY-MM-DD-<title>.md file is included in the PR -->

## Governance

<!-- TODO: How are disputes about block content resolved?
     Who has final say on whether a block is merged?
     Example: "The chain owner (@username) has final merge authority.
               Disputed blocks should be raised as GitHub issues for discussion." -->

## Maintainers

<!-- TODO: List the GitHub usernames of chain maintainers.
     - @username1
     - @username2 -->
`;
}
//#endregion
//#region src/templates/contributing.ts
function contributingMarkdown(opts) {
	const { dir, branch } = opts;
	return `# Contributing

This repository is managed with [glorychain](https://github.com/glorychain/glorychain) —
a protocol for creating tamper-evident, cryptographically signed audit chains stored as JSON
files in a GitHub repository.

---

## Submission Guidelines

> **See [CHAIN_CHARTER.md](./CHAIN_CHARTER.md) (and/or the genesis block) for submission
> guidelines, acceptance criteria, and governance rules specific to this chain.**
>
> The sections below document the *mechanics* of contribution — the commands to run and the
> process to follow. The charter defines *what* is acceptable to submit.

---

## Directory Structure

\`\`\`
${dir}/                        # Chain JSON files (one per chain)
adr/                           # Architecture Decision Records (Markdown)
  YYYY-MM-DD-<title>.md
.github/
  workflows/
    glorychain-verify.yml     # Automated chain verification on PRs
  ISSUE_TEMPLATE/
    block-submission.yml       # Template for proposing a new block
    adr-submission.yml         # Template for proposing an ADR
  pull_request_template.md     # PR checklist for block submissions
CHAIN_CHARTER.md               # Purpose, scope, and governance for this chain
CONTRIBUTING.md                # This file
\`\`\`

---

## Submitting a Block

### 1. Generate a key pair (first time only)

\`\`\`sh
npx glorychain@latest keygen
\`\`\`

> **Security warning:** ${CUSTODY_WARNING}

Save your private key somewhere secure. Share your **public key** with the chain maintainer
so they can verify your blocks.

### 2. Create the block content

Use the template command to generate a content stub:

\`\`\`sh
npx glorychain@latest template --type block --out block-draft.md
\`\`\`

Edit \`block-draft.md\` to fill in your content. See \`CHAIN_CHARTER.md\` for required format.

### 3. Append the block

\`\`\`sh
npx glorychain@latest append \\
  --chain <chain-id> \\
  --key <your-private-key> \\
  --pubkey <your-public-key> \\
  --content "$(cat block-draft.md)" \\
  --dir ${dir}
\`\`\`

### 4. Verify locally

\`\`\`sh
npx glorychain@latest verify --chain <chain-id> --dir ${dir}
\`\`\`

Verification must pass before opening a PR.

### 5. Open a pull request

Push your branch and open a PR. The \`.github/pull_request_template.md\` will guide you
through the checklist.

---

## Submitting an ADR

Architecture Decision Records are Markdown files stored in \`adr/\` and optionally anchored
to the chain by appending a block whose content references them.

### 1. Create the ADR file

\`\`\`sh
npx glorychain@latest template --type adr --title "Your Decision Title" --out adr/$(date +%Y-%m-%d)-your-decision-title.md
\`\`\`

Edit the file to fill in Context, Decision, and Consequences.

### 2. Anchor to the chain (optional but recommended)

\`\`\`sh
npx glorychain@latest append \\
  --chain <chain-id> \\
  --key <your-private-key> \\
  --pubkey <your-public-key> \\
  --content "$(cat adr/YYYY-MM-DD-your-decision-title.md)" \\
  --dir ${dir}
\`\`\`

### 3. Open a pull request

Include both the \`adr/\` file and the updated chain JSON in your PR.

---

## Verification

The \`.github/workflows/glorychain-verify.yml\` workflow runs automatically on every PR
that touches files under \`${dir}/\`.

- If **all chains pass** verification, the PR check is green.
- If **any chain fails**, the check is red and the PR is blocked from merge.

To reproduce CI verification locally:

\`\`\`sh
for f in ${dir}/*.json; do
  chainId=$(basename "$f" .json)
  npx glorychain@latest verify --chain "$chainId" --dir ${dir}
done
\`\`\`

### What verification checks

- Every block's signature is valid (signed by the claimed public key)
- The chain's hash linkage is unbroken (each block references the previous block's hash)
- No blocks have been inserted, removed, or reordered

### Exit codes

- \`0\` — chain is valid
- \`1\` — chain is invalid or an error occurred

---

## Branching and merge policy

All block submissions should be made on a feature branch and merged via PR to \`${branch}\`.
Direct commits to \`${branch}\` are discouraged — CI verification only runs on PRs.

See \`CHAIN_CHARTER.md\` for reviewer requirements and merge authority.
`;
}
//#endregion
//#region src/templates/pr-template.ts
function prTemplateMarkdown() {
	return `## Block / ADR Submission

> **For acceptance criteria, submission guidelines, and governance rules specific to this chain, see [CHAIN_CHARTER.md](../CHAIN_CHARTER.md) and/or the genesis block.**

### Chain details

- **Chain ID:** <!-- e.g. abc-123 -->
- **Block type:** <!-- block / ADR -->
- **Resulting block number:** <!-- if known -->

### Summary

<!-- Describe what this block records and why it matters. -->

### Checklist

- [ ] I have run \`npx glorychain@latest verify --chain <chain-id> --dir chains\` locally and it passes
- [ ] The block content follows the format described in CHAIN_CHARTER.md
- [ ] My public key is on record (or included in the block content)
- [ ] For ADRs: the \`adr/YYYY-MM-DD-<title>.md\` file is included in this PR
`;
}
//#endregion
//#region src/templates/verify-workflow.ts
function verifyWorkflowYaml(opts) {
	const { dir, branch } = opts;
	const S = "$";
	return `name: Glory Chain Verify

on:
  pull_request:
    branches: [${branch}]
    paths: ['${dir}/**']

concurrency:
  group: glorychain-verify-${S}{{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: Verify chains
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Verify all chains
        shell: bash
        run: |
          shopt -s nullglob
          chains=(${dir}/*.json)
          if [ ${S}{#chains[@]} -eq 0 ]; then
            echo "No chain files found in ${dir}/ — skipping verification."
            exit 0
          fi
          failed=0
          for f in "${S}{chains[@]}"; do
            chainId="${S}(basename "${S}f" .json)"
            echo "Verifying chain: ${S}chainId"
            if ! npx --yes glorychain@latest verify --chain "${S}chainId" --dir "${dir}"; then
              echo "FAILED: ${S}chainId"
              failed=1
            fi
          done
          exit ${S}failed
`;
}
//#endregion
//#region src/scaffold.ts
const GITKEEP_CONTENT = "Cg==";
function scaffoldHeaders(token) {
	return {
		Authorization: `Bearer ${token}`,
		Accept: "application/vnd.github+json",
		"Content-Type": "application/json",
		"X-GitHub-Api-Version": "2022-11-28"
	};
}
function apiBase(owner, repo) {
	return `https://api.github.com/repos/${owner}/${repo}/contents`;
}
async function writeFile(owner, repo, token, path, content, branch) {
	const base = apiBase(owner, repo);
	const url = `${base}/${path}?ref=${branch}`;
	const headers = scaffoldHeaders(token);
	if ((await fetch(url, { headers })).ok) return {
		action: "skipped",
		path
	};
	const body = {
		message: `glorychain: scaffold ${path}`,
		content,
		branch
	};
	const res = await fetch(`${base}/${path}`, {
		method: "PUT",
		headers,
		body: JSON.stringify(body)
	});
	if (!res.ok) return {
		action: "error",
		path,
		error: `HTTP ${res.status} ${res.statusText}`
	};
	return {
		action: "created",
		path
	};
}
function toBase64(text) {
	return Buffer.from(text, "utf8").toString("base64");
}
async function scaffoldRepo(config, options = {}) {
	const branch = options.branch ?? config.branch ?? "main";
	const dir = options.dir ?? config.dir ?? "chains";
	const { owner, repo, token } = config;
	const files = [
		{
			path: `${dir}/.gitkeep`,
			content: GITKEEP_CONTENT
		},
		{
			path: "adr/.gitkeep",
			content: GITKEEP_CONTENT
		},
		{
			path: ".github/CODEOWNERS",
			content: toBase64("# Add code owners here\n# * @your-username\n")
		},
		{
			path: "README.md",
			content: toBase64(`# ${repo}\n\nThis repository is managed with [glorychain](https://github.com/glorychain/glorychain).\n\nSee [CONTRIBUTING.md](./CONTRIBUTING.md) and [CHAIN_CHARTER.md](./CHAIN_CHARTER.md) to get started.\n`)
		},
		{
			path: ".github/workflows/glorychain-verify.yml",
			content: toBase64(verifyWorkflowYaml({
				dir,
				branch
			}))
		},
		{
			path: ".github/pull_request_template.md",
			content: toBase64(prTemplateMarkdown())
		},
		{
			path: ".github/ISSUE_TEMPLATE/block-submission.yml",
			content: toBase64(blockIssueTemplateYaml())
		},
		{
			path: ".github/ISSUE_TEMPLATE/adr-submission.yml",
			content: toBase64(adrIssueTemplateYaml())
		},
		{
			path: "CHAIN_CHARTER.md",
			content: toBase64(chainCharterMarkdown({ dir }))
		},
		{
			path: "CONTRIBUTING.md",
			content: toBase64(contributingMarkdown({
				dir,
				branch
			}))
		}
	];
	const results = [];
	for (const file of files) try {
		const result = await writeFile(owner, repo, token, file.path, file.content, branch);
		results.push(result);
	} catch (err) {
		results.push({
			action: "error",
			path: file.path,
			error: String(err)
		});
	}
	return results;
}
//#endregion
export { GitHubConnector, getPagesUrl, scaffoldRepo };

//# sourceMappingURL=index.mjs.map