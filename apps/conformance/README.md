# @glorychain/conformance

> Protocol conformance test suite. Verifies that any glorychain implementation meets the full protocol specification.

The conformance suite is the canonical way to prove a chain is protocol-compliant. It's independent of any specific connector, storage layer, or implementation — it operates on the chain data itself.

---

## What is conformance testing?

The glorychain protocol is a specification, not just a library. Third parties can implement their own chain engines. Connectors can be written by anyone. **Conformance testing ensures that any implementation — official or community-built — produces chains that any other implementation can read and verify.**

If your implementation passes all conformance suites, your chains are interoperable. If it doesn't, the suite tells you exactly which invariant broke and where.

---

## Usage

```bash
# Test a chain stored in a GitHub repository
conformance run \
  --connector github \
  --owner     my-org \
  --repo      my-repo \
  --token     $GITHUB_TOKEN \
  --chain     <chainId>

# Test a chain stored on the file system
conformance run \
  --connector fs \
  --dir       ./chains \
  --chain     <chainId>
```

---

## Test suites

| Suite | What it verifies |
|-------|-----------------|
| **Block hash chain** | Every block's `previousHash` is the SHA-256 hash of the prior block's canonical content |
| **Signature integrity** | Every block's Ed25519 signature verifies against its `authorPublicKey` |
| **Genesis block** | The chain has exactly one genesis block, at position 0, with `previousHash: null` |
| **Ordering** | Block numbers are monotonically increasing with no gaps |
| **Schema** | Every block conforms to the protocol Zod schema — required fields present, correct types |

All five suites must pass for a chain to be considered protocol-compliant.

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | All suites passed — chain is protocol-compliant |
| `1` | One or more suites failed — chain has integrity issues |
| `2` | Configuration error — bad flags, missing token, connector unavailable |

---

## Sample output

```
glorychain conformance v1.0.0
Chain: 3e7c9f2a-1234-5678-abcd-ef0123456789
Connector: github (my-org/my-repo)

Running test suites...

  ✓ Block hash chain         14/14 blocks verified
  ✓ Signature integrity      14/14 signatures valid
  ✓ Genesis block            1 genesis block at position 0
  ✓ Ordering                 blocks 0–13 in sequence, no gaps
  ✓ Schema                   14/14 blocks schema-valid

All 5 suites passed. Chain is protocol-compliant.
```

Failed output:

```
  ✓ Block hash chain         7/14 blocks verified
  ✗ Block hash chain         FAILED at block 8
    Expected previousHash: a3f9c2...
    Got previousHash:      00000000...
    Probable cause: block 7 was modified after signing

  ✓ Signature integrity      14/14 signatures valid
  ...

1 suite failed. Chain has integrity issues.
```

---

## CI integration

The `glorychain-verify.yml` workflow written by `glorychain init` runs the full conformance suite automatically on every push and pull request to your chain repository:

```yaml
# .github/workflows/glorychain-verify.yml
on: [push, pull_request]
jobs:
  conformance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run glorychain conformance
        run: npx @glorychain/conformance run --connector github ...
```

PRs that would break chain integrity are blocked before merging. A green CI badge on a glorychain repo is a public statement that the chain passes all protocol conformance tests.

---

## For protocol implementors

If you're building a custom chain engine compatible with the glorychain protocol:

1. Implement the connector interface from `@glorychain/core`
2. Run the full conformance suite against chains produced by your engine
3. All 5 suites must pass for every chain you produce

The conformance suite is the acceptance test for protocol compatibility. Pass it, and your chains are interoperable with every other glorychain implementation.
