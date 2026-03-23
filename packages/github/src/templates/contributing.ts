import { CUSTODY_WARNING } from "@glorychain/core";

export function contributingMarkdown(opts: { dir: string; branch: string }): string {
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
