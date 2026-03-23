export function chainCharterMarkdown(opts: { dir: string }): string {
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
