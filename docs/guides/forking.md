# Forking a chain

How to handle key compromise, signer changes, and governance transitions.

---

## When to fork

A fork creates a new chain that branches from an existing one at a specific block. Fork when:

- **A signing key is compromised** — the old key can no longer be trusted; all future blocks need a new key
- **A signer leaves** — a board chair, secretary, or deploy account changes
- **Governance changes** — the rules of who can append change fundamentally
- **Schema needs to change** — the genesis schema can't be modified; fork to redefine it

Forking is not the same as abandoning a chain. The original chain remains intact and verifiable. The fork carries provenance — it knows where it came from and why.

---

## How to fork

### CLI

```bash
glorychain fork \
  --chain <originalChainId> \
  --at <blockNumber> \
  --key <newPrivateKey> \
  --pubkey <newPublicKey> \
  --reason "Signing key compromised. New key issued 2026-03-15." \
  --dir ./chains
```

### Programmatic

```ts
import { forkChain } from "@glorychain/core"

const originalChain = await connector.read(originalChainId)

const result = forkChain(
  originalChain,
  {
    forkPoint: 42,           // last trusted block
    reason: "Key compromise — new key issued 2026-03-15.",
    content: "Continuation of acme-aid-board-resolutions from block 42 onwards.",
    publicKey: newPublicKey,
  },
  newPrivateKey,
)

if (!result.ok) throw new Error(result.error.message)

await connector.write(result.value)
console.log("New chain:", result.value.metadata.chainId)
```

---

## What a fork looks like

The fork genesis block carries provenance in its metadata:

```json
{
  "metadata": {
    "chainId": "new-chain-id",
    "forkedFrom": "original-chain-id",
    "forkPoint": 42,
    "forkReason": "Key compromise — new key issued 2026-03-15.",
    "purpose": "Continuation of board resolutions",
    "protocolVersion": "0.1"
  },
  "blocks": [...]
}
```

Anyone verifying the fork can trace it back to the original chain and understand why it was created.

---

## Communicating a fork

When you fork, announce it clearly:

1. Append a final block to the original chain explaining the fork:
   ```
   FORK: This chain is superseded by <newChainId> from block 42 onwards.
   Reason: Signing key compromised. New key: <newPublicKey>.
   ```

2. Update any references (documentation, systems) to point to the new chain

3. Keep the original chain — don't delete it. Its history is still valid up to the fork point.

---

## Key rotation vs forking

| Situation | Action |
|---|---|
| Key exposed or compromised | Fork |
| Signer leaves the organisation | Fork |
| Routine key rotation (precautionary) | Fork |
| Adding a second signer (not changing the primary) | Append a governance block, no fork needed |

When in doubt, fork. The cost is low; the integrity guarantee is preserved.
