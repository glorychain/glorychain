export function adrIssueTemplateYaml(): string {
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
