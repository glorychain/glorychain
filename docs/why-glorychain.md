# Why glorychain

## A story

In 2024, a planning authority approved a controversial housing development. The vote was 6–2. Within a week, two councillors publicly claimed they had voted against it. The minutes had been updated. There was no original record anyone could point to.

Nobody could prove what happened.

This is not unusual. It happens in board meetings, in legislative chambers, in audit trails, in the version history of policy documents. Records get changed. People misremember. Institutions revise. And when there is no tamper-evident original, there is no ground truth.

glorychain exists because **institutions need a way to put things permanently on record** — and because that record needs to be verifiable by anyone, not just the institution itself.

---

## What glorychain does

glorychain lets anyone create a **chain of signed, hash-linked records**. Once a block is written to a chain, it cannot be modified without breaking every subsequent block's cryptographic proof. Tampering is not just difficult — it is mathematically detectable.

Every block is:
- **Signed** with an Ed25519 keypair — permanently attributed to whoever holds that key
- **Hash-linked** to the block before it — a SHA-256 chain that breaks the moment anything changes
- **Verifiable by anyone** — no central authority, no API, no trust required

You can give someone a chain file and they can verify its integrity completely offline, using the glorychain CLI or any independent implementation of the protocol.

---

## What glorychain does not do

**It is a notary, not a judge.**

glorychain does not verify that the *content* of a block is true — only that it was signed by a specific keypair at a specific time and has not been modified since. A chain owner can still append false information. The protocol records and attributes; it does not adjudicate.

It also does not:
- Control who can read a chain (chains are plaintext — access control is your responsibility)
- Guarantee the identity behind a keypair (key binding to a real-world identity is out of scope)
- Prevent a chain owner from abandoning a chain

---

## Who it's for

**Institutions that make consequential decisions** and want a permanent, tamper-evident record of them:
- Planning authorities, councils, and government bodies
- NGO boards and charities
- Open source projects maintaining architecture decision records
- Corporations requiring audit trails for compliance
- Legislators and public officials making commitments on record

**Developers building accountability tooling** — glorychain provides the protocol layer; you build the interface, the governance rules, and the user experience on top.

**Anyone who needs to prove something happened** — and needs that proof to be independently verifiable without trusting a central authority.

---

## Why not a blockchain?

Public blockchains are designed for trustless value transfer between adversarial parties. They are expensive, slow, and complex for most institutional use cases.

glorychain is **blockchain for general-purpose use** — the same cryptographic primitives (signing, hashing, append-only history) applied to a fundamentally different problem: institutional record-keeping. The architecture is much simpler: a single chain, a single signer (or a defined set of signers), and a storage backend you control. No network. No tokens. No consensus protocol.

The result is a system you can run with a single CLI command, store in a GitHub repository, and verify with no internet connection.

---

## The open protocol commitment

glorychain is an open protocol, not a product. The specification is public, the reference implementation is MIT-licensed, and anyone can build an independent implementation. A chain created with glorychain can be verified by any conforming implementation — including one you write yourself.

This matters because a tamper-evident record is only as trustworthy as the system that verifies it. If verification requires a proprietary service, the guarantee is hollow.

---

## Get started

→ [Quickstart — create your first chain in 5 minutes](quickstart.md)
→ [See real-world use cases](use-cases.md)
→ [Read the protocol spec](reference/protocol-spec.md)
