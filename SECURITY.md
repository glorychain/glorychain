# Security

## Reporting a vulnerability

**Do not open a public issue for security vulnerabilities.**

Report security issues privately by emailing the maintainers or using [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability).

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix if you have one

You'll receive an acknowledgement within 48 hours. We'll keep you informed as we work on a fix.

---

## Cryptographic primitives

glorychain uses:

- **Ed25519** for signing (via the Web Crypto API / `@noble/ed25519`)
- **SHA-256** for block hashing (via the Web Crypto API)
- **base64url** encoding for keys and signatures

Private keys are never stored by the protocol. Key management is the responsibility of the chain creator.

---

## Threat model

glorychain provides **tamper-evidence**, not access control. It guarantees:

- Any modification to a block's content is mathematically detectable
- Every block is permanently attributed to the keypair that signed it
- The chain is append-only — no deletions, no silent edits

It does **not** guarantee:

- Confidentiality (chains are plaintext)
- That the identity behind a keypair is who they claim to be
- Protection against a chain owner appending false content with their own valid key

The protocol is a notary, not a judge.
