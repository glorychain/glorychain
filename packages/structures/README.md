# @glorychain/structures

> Stateful data structures for glorychain. Derive structured state from a chain by replaying its blocks through a pure reducer.

The chain is the source of truth. A structure is a live view of it.

```bash
npm install @glorychain/structures
# or
pnpm add @glorychain/structures
```

---

## How it works

Every structure follows the same pattern:

1. **Create a chain** with the structure's `genesisSchema` — the protocol enforces that all appended blocks contain valid events
2. **Append events** using the structure's static builders — they return a content string ready for `appendBlock`
3. **Replay** the chain into current state with `Structure.fromChain(chain)`

```
Block 0   Genesis
Block 1   {"type":"APPOINT","id":"sarah","name":"Sarah Chen","role":"CEO","reportsTo":null}
Block 2   {"type":"APPOINT","id":"james","name":"James Okafor","role":"VP Eng","reportsTo":"sarah"}
Block 3   {"type":"PROMOTE","id":"james","role":"CTO"}

OrgTree.fromChain(chain)  →  { sarah (CEO), james (CTO, reports to sarah) }
```

No external database. No sync. State is always derived from the chain on demand.

---

## OrgTree

An organisational hierarchy. Supports appointments, promotions, transfers, departures, and suspensions.

```ts
import { appendBlock, createChain, generateKeypair } from "@glorychain/core"
import { FsConnector } from "@glorychain/fs"
import { OrgTree } from "@glorychain/structures"

const connector = new FsConnector("./chains")
const { value: { privateKey, publicKey } } = generateKeypair()

// Create chain with schema enforcement
const { value: chain } = createChain({
  content: "Acme Corp organisational structure.",
  purpose: "org-chart",
  creatorId: "coo@acme.com",
  identityType: "anonymous",
  publicKey,
  schema: OrgTree.genesisSchema,
}, privateKey)

await connector.write(chain)

// Append events
let current = await connector.read(chain.metadata.chainId)

const appoint = (input) => appendBlock(current, {
  content: OrgTree.appoint(input), publicKey }, privateKey)

current = (await appoint({ id: "sarah", name: "Sarah Chen", role: "CEO", reportsTo: null })).value
current = (await appoint({ id: "james", name: "James Okafor", role: "VP Eng", reportsTo: "sarah" })).value
current = (await appoint({ id: "liu", name: "Liu Wei", role: "Staff Engineer", reportsTo: "james" })).value

await connector.write(current)

// Query
const tree = OrgTree.fromChain(current)

tree.get("sarah")                 // OrgMember
tree.directReports("sarah")       // [james]
tree.subtree("sarah")             // [james, liu]
tree.pathTo("liu")                // [sarah, james, liu]
tree.roots                        // [sarah]
tree.headcount                    // 3
```

### Event builders

| Builder | Description |
|---|---|
| `OrgTree.appoint({ id, name, role, reportsTo })` | Add a new member |
| `OrgTree.depart({ id, reason?, handoverTo? })` | Mark departed; optionally reassign direct reports |
| `OrgTree.promote({ id, role, reportsTo? })` | Change role; optionally change reporting line |
| `OrgTree.transfer({ id, reportsTo })` | Change reporting line only |
| `OrgTree.rename({ id, role })` | Change title without promotion |
| `OrgTree.suspend({ id, reason? })` | Suspend (active but excluded from `current`) |
| `OrgTree.reinstate({ id })` | Reinstate after suspension |

### OrgMember

```ts
interface OrgMember {
  id: string
  name: string
  role: string
  reportsTo: string | null
  active: boolean           // false after DEPART
  suspended: boolean
  appointedAtBlock: number
  lastUpdatedAtBlock: number
  metadata: Record<string, string>
}
```

---

## KeyValueStore

An auditable key-value config register. Every SET, DELETE, and CLEAR is a block. Full history is in the chain; `KeyValueStore` provides current state.

```ts
import { KeyValueStore } from "@glorychain/structures"

const { value: chain } = createChain({
  content: "Production config register.",
  purpose: "config",
  creatorId: "deploy-bot@company.com",
  identityType: "anonymous",
  publicKey,
  schema: KeyValueStore.genesisSchema,
}, privateKey)

// Append events
await appendBlock(chain, { content: KeyValueStore.set({
  key: "rate_limit_multiplier",
  value: "1.5",
  metadata: { approvedBy: "oncall-lead@company.com" },
}), publicKey }, privateKey)

await appendBlock(chain, { content: KeyValueStore.delete("deprecated_flag"), publicKey }, privateKey)

// Query
const store = KeyValueStore.fromChain(chain)

store.get("rate_limit_multiplier")       // "1.5"
store.getEntry("rate_limit_multiplier")  // KeyValueEntry — includes setAtBlock + metadata
store.has("deprecated_flag")            // false
store.keys                              // string[]
store.toObject()                        // Record<string, string>
store.size                              // number
```

### Event builders

| Builder | Description |
|---|---|
| `KeyValueStore.set({ key, value, metadata? })` | Set a key |
| `KeyValueStore.delete(key)` | Delete a key |
| `KeyValueStore.clear()` | Remove all keys |

---

## MemberSet

An auditable membership list. Tracks joins, departures, role changes, and suspensions.

Good for: board registers, working group memberships, approved vendor lists, allowlists.

```ts
import { MemberSet } from "@glorychain/structures"

const { value: chain } = createChain({
  content: "Acme Aid board member register.",
  purpose: "membership",
  creatorId: "board.chair@acme-aid.org",
  identityType: "anonymous",
  publicKey,
  schema: MemberSet.genesisSchema,
}, privateKey)

// Append events
await appendBlock(chain, { content: MemberSet.join({
  id: "alice@acme-aid.org",
  name: "Alice Nakamura",
  role: "board-member",
}), publicKey }, privateKey)

await appendBlock(chain, { content: MemberSet.roleChange({
  id: "alice@acme-aid.org",
  role: "board-chair",
}), publicKey }, privateKey)

// Query
const set = MemberSet.fromChain(chain)

set.get("alice@acme-aid.org")    // Member
set.active                       // non-departed members (includes suspended)
set.current                      // active and not suspended
set.byRole("board-chair")        // active members with this role
set.headcount                    // active count
set.all                          // everyone including departed
```

### Event builders

| Builder | Description |
|---|---|
| `MemberSet.join({ id, name, role? })` | Add a member |
| `MemberSet.leave({ id, reason? })` | Mark as departed |
| `MemberSet.roleChange({ id, role })` | Change role |
| `MemberSet.suspend({ id, reason? })` | Suspend |
| `MemberSet.reinstate({ id })` | Reinstate |

---

## Build your own structure

Any structure can be built with the shared `replayChain` utility:

```ts
import type { Chain } from "@glorychain/core"
import { replayChain } from "@glorychain/structures"

type MyEvent = { type: "ADD"; item: string } | { type: "REMOVE"; item: string }
type MyState = { items: Set<string> }

function reducer(state: MyState, event: MyEvent): MyState {
  const items = new Set(state.items)
  if (event.type === "ADD") items.add(event.item)
  if (event.type === "REMOVE") items.delete(event.item)
  return { items }
}

function parse(content: string): MyEvent | null {
  try {
    const e = JSON.parse(content) as MyEvent
    return ["ADD", "REMOVE"].includes(e.type) ? e : null
  } catch {
    return null
  }
}

function fromChain(chain: Chain): MyState {
  return replayChain(chain, reducer, { items: new Set() }, parse)
}
```

---

## Further reading

- [Structures guide](../../docs/guides/structures.md) — detailed walkthrough with real-world examples
- [Schema validation](../../docs/guides/schema-validation.md) — enforcing block content structure
- [Programmatic API](../../docs/guides/programmatic-api.md) — using `@glorychain/core` directly
