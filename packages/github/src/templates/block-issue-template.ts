export function blockIssueTemplateYaml(): string {
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
