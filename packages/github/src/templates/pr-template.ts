export function prTemplateMarkdown(): string {
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
