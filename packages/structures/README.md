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

const { value: chain } = createChain({
  content: "Acme Corp organisational structure.",
  purpose: "org-chart",
  creatorId: "coo@acme.com",
  identityType: "anonymous",
  publicKey,
  contentSchema: OrgTree.genesisSchema,
}, privateKey)

await connector.write(chain)

let current = await connector.read(chain.metadata.chainId)

const appoint = (input) => appendBlock(current, {
  content: OrgTree.appoint(input), publicKey }, privateKey)

current = (await appoint({ id: "sarah", name: "Sarah Chen", role: "CEO", reportsTo: null })).value
current = (await appoint({ id: "james", name: "James Okafor", role: "VP Eng", reportsTo: "sarah" })).value
current = (await appoint({ id: "liu", name: "Liu Wei", role: "Staff Engineer", reportsTo: "james" })).value

await connector.write(current)

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
  contentSchema: KeyValueStore.genesisSchema,
}, privateKey)

await appendBlock(chain, { content: KeyValueStore.set({
  key: "rate_limit_multiplier",
  value: "1.5",
  metadata: { approvedBy: "oncall-lead@company.com" },
}), publicKey }, privateKey)

await appendBlock(chain, { content: KeyValueStore.delete("deprecated_flag"), publicKey }, privateKey)

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
  contentSchema: MemberSet.genesisSchema,
}, privateKey)

await appendBlock(chain, { content: MemberSet.join({
  id: "alice@acme-aid.org",
  name: "Alice Nakamura",
  role: "board-member",
}), publicKey }, privateKey)

await appendBlock(chain, { content: MemberSet.roleChange({
  id: "alice@acme-aid.org",
  role: "board-chair",
}), publicKey }, privateKey)

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

## VoteRegister

A structured motion and vote ledger. Records individual votes, tallies, and outcomes.

Good for: board meetings, governance votes, committee decisions, DAO proposals.

```ts
import { VoteRegister } from "@glorychain/structures"

const { value: chain } = createChain({
  content: "Board vote register.",
  purpose: "votes",
  creatorId: "secretary@acme-aid.org",
  identityType: "anonymous",
  publicKey,
  contentSchema: VoteRegister.genesisSchema,
}, privateKey)

// Open a motion
await appendBlock(chain, { content: VoteRegister.motion({
  id: "res-2026-001",
  title: "Approve annual budget of $2.4M",
  proposedBy: "chair@acme-aid.org",
}), publicKey }, privateKey)

// Cast votes
await appendBlock(chain, { content: VoteRegister.cast({
  motionId: "res-2026-001", voterId: "alice@acme-aid.org", vote: "yes",
}), publicKey }, privateKey)

// Close the motion
await appendBlock(chain, { content: VoteRegister.close({
  motionId: "res-2026-001",
}), publicKey }, privateKey)

const register = VoteRegister.fromChain(chain)

register.get("res-2026-001")           // Motion
register.tally("res-2026-001")         // { yes: 7, no: 1, abstain: 1, total: 9 }
register.voters("res-2026-001")        // string[] — all who voted
register.passed                        // Motion[] — all passed motions
register.open                          // Motion[] — motions still accepting votes
```

### Event builders

| Builder | Description |
|---|---|
| `VoteRegister.motion({ id, title, proposedBy? })` | Open a motion |
| `VoteRegister.cast({ motionId, voterId, vote })` | Cast a vote (`"yes"`, `"no"`, `"abstain"`) |
| `VoteRegister.close({ motionId, outcome?, notes? })` | Close; outcome derived from yes > no if omitted |
| `VoteRegister.withdraw({ motionId, reason? })` | Withdraw a motion |

---

## DecisionLog

A structured register of decisions with lifecycle tracking. Each decision has a stable ID, body text, and status. Superseded decisions remain permanently in the chain.

Good for: ADR registers, policy decisions, resolutions, standards bodies.

```ts
import { DecisionLog } from "@glorychain/structures"

const { value: chain } = createChain({
  content: "Architecture Decision Register.",
  purpose: "decisions",
  creatorId: "core-team@hyperdb.dev",
  identityType: "anonymous",
  publicKey,
  contentSchema: DecisionLog.genesisSchema,
}, privateKey)

await appendBlock(chain, { content: DecisionLog.record({
  id: "ADR-001",
  title: "Use RocksDB",
  body: "Chosen for column family support required by transaction log isolation.",
  decidedBy: "core-team@hyperdb.dev",
}), publicKey }, privateKey)

await appendBlock(chain, { content: DecisionLog.record({
  id: "ADR-002",
  title: "Migrate to custom LSM",
  body: "RocksDB licence incompatible with v3 distribution terms.",
}), publicKey }, privateKey)

await appendBlock(chain, { content: DecisionLog.supersede({
  id: "ADR-001", supersededBy: "ADR-002",
}), publicKey }, privateKey)

const log = DecisionLog.fromChain(chain)

log.get("ADR-001")       // Decision — status: "superseded"
log.active               // Decision[] — not superseded or withdrawn
log.lineage("ADR-001")   // [ADR-001, ADR-002] — follow the supersession chain
```

### Event builders

| Builder | Description |
|---|---|
| `DecisionLog.record({ id, title, body, decidedBy? })` | Record a new decision |
| `DecisionLog.supersede({ id, supersededBy, reason? })` | Mark superseded by another decision |
| `DecisionLog.withdraw({ id, reason? })` | Withdraw a decision |
| `DecisionLog.annotate({ id, note })` | Append a note without changing status |

---

## Timeline

An ordered sequence of tagged entries. Lightweight and flexible.

Good for: voting records, policy commitments, press release logs, event histories.

```ts
import { Timeline } from "@glorychain/structures"

const { value: chain } = createChain({
  content: "Sen. Maya Rodriguez — climate record.",
  purpose: "timeline",
  creatorId: "senator.rodriguez@senate.gov",
  identityType: "anonymous",
  publicKey,
  contentSchema: Timeline.genesisSchema,
}, privateKey)

await appendBlock(chain, { content: Timeline.entry({
  id: "vote-sb412",
  title: "VOTED YES — Clean Energy Transition Act (SB-412). Passed 52–48.",
  tags: ["climate", "vote"],
  date: "2026-02-03",
}), publicKey }, privateKey)

await appendBlock(chain, { content: Timeline.entry({
  id: "commit-netzero",
  title: "COMMITTED — Net zero by 2035.",
  tags: ["climate", "commitment"],
  date: "2026-02-14",
}), publicKey }, privateKey)

const timeline = Timeline.fromChain(chain)

timeline.all                      // TimelineEntry[] — insertion order
timeline.active                   // non-retracted entries
timeline.byTag("climate")         // TimelineEntry[]
timeline.tags                     // ["climate", "commitment", "vote"]
timeline.count                    // 2
```

### Event builders

| Builder | Description |
|---|---|
| `Timeline.entry({ id, title, body?, tags?, date? })` | Add an entry |
| `Timeline.retract({ id, reason? })` | Retract an entry (remains in chain) |

---

## DocumentRegister

A versioned document registry. Each document has a content hash for tamper-evidence.

Good for: policy registers, contract logs, standards publications, compliance documents.

```ts
import { DocumentRegister } from "@glorychain/structures"

const { value: chain } = createChain({
  content: "Safeguarding policy register.",
  purpose: "documents",
  creatorId: "secretary@acme-aid.org",
  identityType: "anonymous",
  publicKey,
  contentSchema: DocumentRegister.genesisSchema,
}, privateKey)

await appendBlock(chain, { content: DocumentRegister.publish({
  id: "policy-safeguarding-v1",
  title: "Safeguarding Policy v1.0",
  hash: "sha256:abc123...",
  url: "https://acme-aid.org/policies/safeguarding-v1.pdf",
  version: "1.0",
}), publicKey }, privateKey)

await appendBlock(chain, { content: DocumentRegister.publish({
  id: "policy-safeguarding-v2",
  title: "Safeguarding Policy v2.0",
  hash: "sha256:def456...",
  version: "2.0",
}), publicKey }, privateKey)

await appendBlock(chain, { content: DocumentRegister.supersede({
  id: "policy-safeguarding-v1",
  supersededBy: "policy-safeguarding-v2",
}), publicKey }, privateKey)

const register = DocumentRegister.fromChain(chain)

register.current             // Document[] — active documents
register.superseded          // Document[]
register.byHash("sha256:abc123...")  // Document | undefined
```

### Event builders

| Builder | Description |
|---|---|
| `DocumentRegister.publish({ id, title, hash, url?, version? })` | Publish a document |
| `DocumentRegister.supersede({ id, supersededBy, reason? })` | Mark superseded |
| `DocumentRegister.withdraw({ id, reason? })` | Withdraw a document |
| `DocumentRegister.restore({ id, reason? })` | Restore a withdrawn document |

---

## AccessList

An auditable grant/revoke log. Every change is a block.

Good for: approved vendor lists, API key registers, employee access logs, allowlists.

```ts
import { AccessList } from "@glorychain/structures"

const { value: chain } = createChain({
  content: "Approved contractor access register.",
  purpose: "access",
  creatorId: "security@company.com",
  identityType: "anonymous",
  publicKey,
  contentSchema: AccessList.genesisSchema,
}, privateKey)

await appendBlock(chain, { content: AccessList.grant({
  id: "contractor-abc",
  label: "Acme Consulting",
  grantedBy: "cto@company.com",
  expiresAt: "2026-12-31T00:00:00.000Z",
}), publicKey }, privateKey)

await appendBlock(chain, { content: AccessList.revoke({
  id: "contractor-xyz",
  reason: "contract ended",
}), publicKey }, privateKey)

const list = AccessList.fromChain(chain)

list.isGranted("contractor-abc")     // true
list.granted                         // AccessEntry[]
list.stale()                         // entries past their expiresAt — generate EXPIRE events
```

### Event builders

| Builder | Description |
|---|---|
| `AccessList.grant({ id, label?, grantedBy?, expiresAt? })` | Grant access |
| `AccessList.revoke({ id, reason?, revokedBy? })` | Revoke access |
| `AccessList.expire({ id })` | Mark as expired (use `stale()` to find candidates) |

---

## ChangeLog

A structured software release log. Deprecations and yanks are permanent and attributable.

Good for: open source packages, internal libraries, API version registers.

```ts
import { ChangeLog } from "@glorychain/structures"

const { value: chain } = createChain({
  content: "glorychain release log.",
  purpose: "changelog",
  creatorId: "releases@glorychain.dev",
  identityType: "anonymous",
  publicKey,
  contentSchema: ChangeLog.genesisSchema,
}, privateKey)

await appendBlock(chain, { content: ChangeLog.release({
  version: "1.0.0",
  notes: "Initial stable release.",
}), publicKey }, privateKey)

await appendBlock(chain, { content: ChangeLog.release({
  version: "2.0.0",
  notes: "New connector API.",
  breaking: true,
}), publicKey }, privateKey)

await appendBlock(chain, { content: ChangeLog.deprecate({
  version: "1.0.0",
  successor: "2.0.0",
  reason: "Connector API superseded.",
}), publicKey }, privateKey)

const log = ChangeLog.fromChain(chain)

log.latest           // Release — most recent active version
log.active           // Release[] — not deprecated or yanked
log.breaking         // Release[] — all breaking releases
log.get("1.0.0")     // Release — status: "deprecated"
```

### Event builders

| Builder | Description |
|---|---|
| `ChangeLog.release({ version, notes?, breaking? })` | Record a release |
| `ChangeLog.deprecate({ version, reason?, successor? })` | Deprecate a version |
| `ChangeLog.yank({ version, reason })` | Yank a version (critical issues) |

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
