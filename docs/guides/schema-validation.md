# Schema validation

Enforce structure on chain content using JSON Schema v7.

---

## What it does

By default, block content is a free-text string. Schema validation lets you define a JSON Schema in the genesis block that all subsequent blocks must conform to. The protocol verifier enforces this automatically.

This is useful when:
- Multiple parties are appending to a chain and you need consistent structure
- You're building tooling that parses chain content programmatically
- You want to catch malformed blocks at append time, not discovery time

---

## Define a schema at genesis

Pass a `schema` object to `createChain`:

```ts
import { createChain } from "@glorychain/core"

const result = createChain(
  {
    content: "Board resolution register.",
    purpose: "NGO governance",
    creatorId: "board.chair@acme-aid.org",
    identityType: "anonymous",
    publicKey,
    schema: {
      type: "object",
      required: ["type", "resolution", "vote", "date"],
      properties: {
        type: { type: "string", enum: ["RESOLUTION", "AMENDMENT", "DEFERRAL"] },
        resolution: { type: "string", minLength: 10 },
        vote: {
          type: "object",
          required: ["for", "against", "abstain"],
          properties: {
            for: { type: "number" },
            against: { type: "number" },
            abstain: { type: "number" },
          },
        },
        date: { type: "string", format: "date" },
        notes: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  privateKey,
)
```

---

## Append structured content

Block content must be a JSON string that conforms to the schema:

```ts
const block = {
  type: "RESOLUTION",
  resolution: "Annual budget of $2.4M approved for fiscal year 2026.",
  vote: { for: 9, against: 0, abstain: 0 },
  date: "2026-01-12",
}

const result = appendBlock(
  chain,
  {
    content: JSON.stringify(block),
    publicKey,
  },
  privateKey,
)
```

If the content does not conform to the schema, `appendBlock` returns an error and the block is not created.

---

## Schema validation during verification

`verifyChain` checks schema conformance for every block. A block whose content violates the genesis schema produces a `SCHEMA_VIOLATION` error:

```ts
const result = await verifyChain(chain)

if (!result.valid) {
  for (const error of result.errors) {
    if (error.code === "SCHEMA_VIOLATION") {
      console.error(`Block ${error.blockNumber} content is invalid`)
      console.error(error.schemaErrors) // JSON Schema validation errors
    }
  }
}
```

---

## CLI usage

Schema is defined in a JSON file passed at creation time:

```bash
glorychain create \
  --key <privateKey> \
  --pubkey <publicKey> \
  --content "Board resolution register." \
  --schema ./resolution-schema.json
```

---

## Tips

- Keep schemas strict (`additionalProperties: false`) to prevent drift
- Use `enum` for type fields to make chains queryable
- Schema is stored in the genesis block's `metadata.schema` — it travels with the chain
- The schema cannot be changed after genesis — fork the chain if you need a schema change
