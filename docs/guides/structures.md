# Structures

`@glorychain/structures` provides stateful data structures built on top of glorychain. Each structure uses event sourcing — you append events as blocks, and replay them to derive current state.

The chain is the source of truth. The structure is a view.

```bash
npm install @glorychain/structures
```

---

## How it works

Every structure follows the same pattern:

1. **Create a chain** with the structure's genesis schema — this enforces that all blocks contain valid events
2. **Append events** using the structure's static event builders — they produce block content strings
3. **Derive state** by replaying the chain through `Structure.fromChain(chain)`

State is always derived from the full chain history. No external database. No sync required.

```
Block 0   Genesis (schema definition)
Block 1   {"type":"APPOINT","id":"sarah",...}  →  sarah joins the tree
Block 2   {"type":"APPOINT","id":"james",...}  →  james joins under sarah
Block 3   {"type":"PROMOTE","id":"james",...}  →  james promoted

OrgTree.fromChain(chain) → current state with sarah + promoted james
```

---

## OrgTree

An organisational hierarchy. Tracks appointments, promotions, departures, transfers, and suspensions.

### Create a chain

```ts
import { createChain } from "@glorychain/core"
import { FsConnector } from "@glorychain/fs"
import { OrgTree } from "@glorychain/structures"

const connector = new FsConnector("./chains")

const chain = createChain(
  {
    content: "Acme Corp organisational structure. Append-only from this point.",
    purpose: "org-chart",
    creatorId: "coo@acme.com",
    identityType: "anonymous",
    publicKey,
    schema: OrgTree.genesisSchema,  // enforces all blocks are valid OrgEvents
  },
  privateKey,
)
await connector.write(chain.value)
```

### Append events

```ts
import { appendBlock } from "@glorychain/core"
import { OrgTree } from "@glorychain/structures"

let chain = await connector.read(chainId)

// Appoint
chain = (await appendBlock(chain, { content: OrgTree.appoint({
  id: "sarah.chen",
  name: "Sarah Chen",
  role: "Chief Executive Officer",
  reportsTo: null,
}), publicKey }, privateKey)).value

// Appoint a direct report
chain = (await appendBlock(chain, { content: OrgTree.appoint({
  id: "james.okafor",
  name: "James Okafor",
  role: "VP Engineering",
  reportsTo: "sarah.chen",
}), publicKey }, privateKey)).value

// Promote
chain = (await appendBlock(chain, { content: OrgTree.promote({
  id: "james.okafor",
  role: "Chief Technology Officer",
}), publicKey }, privateKey)).value

// Transfer reporting line
chain = (await appendBlock(chain, { content: OrgTree.transfer({
  id: "liu.wei",
  reportsTo: "sarah.chen",
}), publicKey }, privateKey)).value

// Departure with handover
chain = (await appendBlock(chain, { content: OrgTree.depart({
  id: "james.okafor",
  reason: "resigned",
  handoverTo: "sarah.chen",
}), publicKey }, privateKey)).value

await connector.write(chain)
```

### Query state

```ts
const tree = OrgTree.fromChain(chain)

tree.get("sarah.chen")                // OrgMember | undefined
tree.directReports("sarah.chen")      // OrgMember[] — immediate reports
tree.subtree("sarah.chen")            // OrgMember[] — everyone below, recursively
tree.pathTo("liu.wei")                // OrgMember[] — root → liu.wei
tree.roots                            // OrgMember[] — members with no manager
tree.active                           // OrgMember[] — all non-departed members
tree.headcount                        // number
tree.atDepth(2)                       // OrgMember[] — members at depth 2 from root
```

### OrgMember shape

```ts
interface OrgMember {
  id: string
  name: string
  role: string
  reportsTo: string | null
  active: boolean           // false after DEPART
  suspended: boolean        // true after SUSPEND, false after REINSTATE
  appointedAtBlock: number
  lastUpdatedAtBlock: number
  metadata: Record<string, string>
}
```

### All event types

| Builder | Description |
|---|---|
| `OrgTree.appoint({ id, name, role, reportsTo })` | Add a new member |
| `OrgTree.depart({ id, reason?, handoverTo? })` | Mark as departed; optionally reassign direct reports |
| `OrgTree.promote({ id, role, reportsTo? })` | Change role; optionally change reporting line |
| `OrgTree.transfer({ id, reportsTo })` | Change reporting line only |
| `OrgTree.rename({ id, role })` | Change title without promotion |
| `OrgTree.suspend({ id, reason? })` | Suspend (still active, excluded from `current`) |
| `OrgTree.reinstate({ id })` | Reinstate after suspension |

---

## KeyValueStore

An auditable key-value config register. Every SET, DELETE, and CLEAR is a block — full history preserved, current state derived on demand.

### Create a chain

```ts
import { KeyValueStore } from "@glorychain/structures"

const chain = createChain(
  {
    content: "Production config register for payments-api.",
    purpose: "config",
    creatorId: "deploy-bot@company.com",
    identityType: "anonymous",
    publicKey,
    schema: KeyValueStore.genesisSchema,
  },
  privateKey,
)
```

### Append events

```ts
// Set a value
await appendBlock(chain, { content: KeyValueStore.set({
  key: "rate_limit_multiplier",
  value: "1.5",
  metadata: { approvedBy: "oncall-lead@company.com", incident: "INC-4821" },
}), publicKey }, privateKey)

// Delete a key
await appendBlock(chain, { content: KeyValueStore.delete("deprecated_flag"), publicKey }, privateKey)

// Clear all keys
await appendBlock(chain, { content: KeyValueStore.clear(), publicKey }, privateKey)
```

### Query state

```ts
const store = KeyValueStore.fromChain(chain)

store.get("rate_limit_multiplier")      // "1.5" | undefined
store.getEntry("rate_limit_multiplier") // KeyValueEntry with value + setAtBlock + metadata
store.has("feature_flag_x")            // boolean
store.keys                             // string[]
store.entries                          // KeyValueEntry[]
store.size                             // number
store.toObject()                       // Record<string, string>
```

### KeyValueEntry shape

```ts
interface KeyValueEntry {
  key: string
  value: string
  setAtBlock: number              // which block last set this key
  metadata: Record<string, string>
}
```

---

## MemberSet

An auditable membership list. Tracks joins, departures, role changes, and suspensions.

Good for: board registers, working group memberships, approved vendor lists, allowlists.

### Create a chain

```ts
import { MemberSet } from "@glorychain/structures"

const chain = createChain(
  {
    content: "Acme Aid board member register.",
    purpose: "membership",
    creatorId: "board.chair@acme-aid.org",
    identityType: "anonymous",
    publicKey,
    schema: MemberSet.genesisSchema,
  },
  privateKey,
)
```

### Append events

```ts
// Join
await appendBlock(chain, { content: MemberSet.join({
  id: "alice.nakamura@acme-aid.org",
  name: "Alice Nakamura",
  role: "board-member",
}), publicKey }, privateKey)

// Role change
await appendBlock(chain, { content: MemberSet.roleChange({
  id: "alice.nakamura@acme-aid.org",
  role: "board-chair",
}), publicKey }, privateKey)

// Leave
await appendBlock(chain, { content: MemberSet.leave({
  id: "bob.osei@acme-aid.org",
  reason: "term expired",
}), publicKey }, privateKey)

// Suspend / reinstate
await appendBlock(chain, { content: MemberSet.suspend({ id: "carol.smith@acme-aid.org" }), publicKey }, privateKey)
await appendBlock(chain, { content: MemberSet.reinstate({ id: "carol.smith@acme-aid.org" }), publicKey }, privateKey)
```

### Query state

```ts
const set = MemberSet.fromChain(chain)

set.get("alice.nakamura@acme-aid.org")  // Member | undefined
set.has("bob.osei@acme-aid.org")        // boolean — includes departed
set.active                              // Member[] — non-departed (includes suspended)
set.current                             // Member[] — active and not suspended
set.byRole("board-member")              // Member[] — active members with this role
set.headcount                           // number — active members
set.all                                 // Member[] — everyone including departed
```

### Member shape

```ts
interface Member {
  id: string
  name: string
  role: string | null
  active: boolean           // false after LEAVE
  suspended: boolean
  joinedAtBlock: number
  lastUpdatedAtBlock: number
  metadata: Record<string, string>
}
```

---

## Building your own structure

Any structure can be built with the shared `replayChain` utility:

```ts
import type { Chain } from "@glorychain/core"
import { replayChain, serialiseEvent } from "@glorychain/structures"

type MyEvent = { type: "ADD"; item: string } | { type: "REMOVE"; item: string }
type MyState = { items: Set<string> }

function myReducer(state: MyState, event: MyEvent): MyState {
  const items = new Set(state.items)
  if (event.type === "ADD") items.add(event.item)
  if (event.type === "REMOVE") items.delete(event.item)
  return { items }
}

function parseMyEvent(content: string): MyEvent | null {
  try {
    const e = JSON.parse(content) as MyEvent
    return ["ADD", "REMOVE"].includes(e.type) ? e : null
  } catch {
    return null
  }
}

function fromChain(chain: Chain): MyState {
  return replayChain(chain, myReducer, { items: new Set() }, parseMyEvent)
}
```

See [Reducer API](../reference/connector-api.md) for full type signatures.
