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
    contentSchema: OrgTree.genesisSchema,  // enforces all blocks are valid OrgEvents
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
    contentSchema: KeyValueStore.genesisSchema,
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
    contentSchema: MemberSet.genesisSchema,
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

## VoteRegister

A motion-and-vote record. Tracks governance motions through their full lifecycle: open, voted, closed, or withdrawn.

Good for: DAO governance, board decisions, working group approvals, release gates.

### Create a chain

```ts
import { VoteRegister } from "@glorychain/structures"

const chain = createChain(
  {
    content: "Protocol governance vote register.",
    purpose: "governance",
    creatorId: "governance@protocol.org",
    identityType: "anonymous",
    publicKey,
    contentSchema: VoteRegister.genesisSchema,
  },
  privateKey,
)
```

### Append events

```ts
// Open a motion
await appendBlock(chain, { content: VoteRegister.motion({
  id: "motion-001",
  title: "Adopt protocol v0.2",
  proposedBy: "alice@protocol.org",
  metadata: { quorum: "3" },
}), publicKey }, privateKey)

// Cast votes
await appendBlock(chain, { content: VoteRegister.cast({
  motionId: "motion-001",
  voterId: "alice@protocol.org",
  vote: "yes",
}), publicKey }, privateKey)

await appendBlock(chain, { content: VoteRegister.cast({
  motionId: "motion-001",
  voterId: "bob@protocol.org",
  vote: "no",
}), publicKey }, privateKey)

// Close the motion
await appendBlock(chain, { content: VoteRegister.close({
  motionId: "motion-001",
  outcome: "passed",
}), publicKey }, privateKey)

// Withdraw an open motion
await appendBlock(chain, { content: VoteRegister.withdraw({
  motionId: "motion-002",
  reason: "superseded by motion-003",
}), publicKey }, privateKey)
```

### Query state

```ts
const register = VoteRegister.fromChain(chain)

register.get("motion-001")           // Motion | undefined
register.tally("motion-001")         // { yes: 1, no: 1, abstain: 0, total: 2 }
register.voters("motion-001")        // string[] — voter IDs
register.all                         // Motion[]
register.open                        // Motion[] — status === "open"
register.passed                      // Motion[] — status === "passed"
register.failed                      // Motion[] — status === "failed"
register.withdrawn                   // Motion[] — status === "withdrawn"
```

### Motion shape

```ts
interface Motion {
  id: string
  title: string
  proposedBy: string | null
  status: "open" | "passed" | "failed" | "withdrawn"
  votes: { yes: Set<string>; no: Set<string>; abstain: Set<string> }
  openedAtBlock: number
  closedAtBlock: number | null
  notes: string | null
  metadata: Record<string, string>
}
```

### All event types

| Builder | Description |
|---|---|
| `VoteRegister.motion({ id, title, proposedBy, metadata? })` | Open a new motion |
| `VoteRegister.cast({ motionId, voterId, vote })` | Cast a vote (`"yes"` \| `"no"` \| `"abstain"`) |
| `VoteRegister.close({ motionId, outcome })` | Close a motion with outcome (`"passed"` \| `"failed"`) |
| `VoteRegister.withdraw({ motionId, reason? })` | Withdraw an open motion |

---

## DecisionLog

A tamper-evident record of decisions. Decisions can supersede earlier ones and be withdrawn — the full lineage is preserved.

Good for: board resolutions, policy decisions, compliance records, change approvals.

### Create a chain

```ts
import { DecisionLog } from "@glorychain/structures"

const chain = createChain(
  {
    content: "Acme Corp board resolution register.",
    purpose: "board-decisions",
    creatorId: "board.secretary@acme.com",
    identityType: "anonymous",
    publicKey,
    contentSchema: DecisionLog.genesisSchema,
  },
  privateKey,
)
```

### Append events

```ts
// Record a decision
await appendBlock(chain, { content: DecisionLog.record({
  id: "RES-2026-001",
  title: "Approve Q1 budget",
  body: "The board approves the Q1 2026 budget of $2.4M as presented.",
  decidedBy: "board",
  metadata: { vote: "5-0", reference: "BOD-2026-Q1" },
}), publicKey }, privateKey)

// Record the new decision
await appendBlock(chain, { content: DecisionLog.record({
  id: "RES-2026-002",
  title: "Approve revised Q1 budget",
  body: "The board approves the revised Q1 2026 budget of $2.6M.",
  decidedBy: "board",
}), publicKey }, privateKey)

// Mark the old decision as superseded
await appendBlock(chain, { content: DecisionLog.supersede({
  id: "RES-2026-001",
  supersededBy: "RES-2026-002",
}), publicKey }, privateKey)

// Annotate without changing status
await appendBlock(chain, { content: DecisionLog.annotate({
  id: "RES-2026-002",
  note: "Implementation completed 2026-02-15",
}), publicKey }, privateKey)
```

### Query state

```ts
const log = DecisionLog.fromChain(chain)

log.get("RES-2026-001")              // Decision | undefined
log.all                              // Decision[]
log.active                           // Decision[] — not superseded or withdrawn
log.superseded                       // Decision[]
log.withdrawn                        // Decision[]
log.lineage("RES-2026-002")          // Decision[] — chain of supersessions, oldest first
```

### Decision shape

```ts
interface Decision {
  id: string
  title: string
  body: string
  decidedBy: string | null
  status: "active" | "superseded" | "withdrawn"
  supersededBy: string | null
  annotations: string[]
  recordedAtBlock: number
  lastUpdatedAtBlock: number
  metadata: Record<string, string>
}
```

### All event types

| Builder | Description |
|---|---|
| `DecisionLog.record({ id, title, body, decidedBy, metadata? })` | Record a new decision |
| `DecisionLog.supersede({ id, supersededBy, reason? })` | Mark a decision as superseded by another |
| `DecisionLog.withdraw({ id, reason? })` | Withdraw a decision |
| `DecisionLog.annotate({ id, note })` | Add a note without changing status |

---

## Timeline

A chronological event log. Entries have tags for filtering. Entries can be retracted (marked inactive) without being deleted.

Good for: project milestones, incident timelines, changelog entries, audit narratives.

### Create a chain

```ts
import { Timeline } from "@glorychain/structures"

const chain = createChain(
  {
    content: "Project Athena milestone timeline.",
    purpose: "timeline",
    creatorId: "pm@company.com",
    identityType: "anonymous",
    publicKey,
    contentSchema: Timeline.genesisSchema,
  },
  privateKey,
)
```

### Append events

```ts
// Add an entry
await appendBlock(chain, { content: Timeline.entry({
  id: "milestone-kickoff",
  title: "Project kickoff",
  body: "Initial planning complete. Team of 6 confirmed.",
  tags: ["milestone", "planning"],
  metadata: { owner: "alice@company.com" },
}), publicKey }, privateKey)

await appendBlock(chain, { content: Timeline.entry({
  id: "incident-001",
  title: "Production outage",
  body: "Payments API unavailable 14:30–15:45 UTC. Root cause: misconfigured rate limiter.",
  tags: ["incident", "production"],
}), publicKey }, privateKey)

// Retract an entry (mark as inactive, not deleted)
await appendBlock(chain, { content: Timeline.retract({
  id: "milestone-kickoff",
  reason: "Duplicate — see milestone-kickoff-v2",
}), publicKey }, privateKey)
```

### Query state

```ts
const timeline = Timeline.fromChain(chain)

timeline.get("incident-001")          // TimelineEntry | undefined
timeline.all                          // TimelineEntry[] — chronological
timeline.active                       // TimelineEntry[] — not retracted
timeline.retracted                    // TimelineEntry[]
timeline.byTag("incident")            // TimelineEntry[] — filtered by tag
timeline.tags                         // string[] — all distinct tags
timeline.count                        // number — total entries
```

### TimelineEntry shape

```ts
interface TimelineEntry {
  id: string
  title: string
  body: string
  tags: string[]
  date: string | null
  retracted: boolean        // true after RETRACT
  addedAtBlock: number
  retractedAtBlock: number | null
  metadata: Record<string, string>
}
```

### All event types

| Builder | Description |
|---|---|
| `Timeline.entry({ id, title, body, tags?, metadata? })` | Add a timeline entry |
| `Timeline.retract({ id, reason? })` | Retract an entry (marks inactive, not deleted) |

---

## DocumentRegister

A version-tracked document registry. Documents can be published, superseded, withdrawn, and restored — full provenance chain preserved.

Good for: policy libraries, compliance documents, contracts, published standards.

### Create a chain

```ts
import { DocumentRegister } from "@glorychain/structures"

const chain = createChain(
  {
    content: "Acme Corp policy document register.",
    purpose: "policy-register",
    creatorId: "compliance@acme.com",
    identityType: "anonymous",
    publicKey,
    contentSchema: DocumentRegister.genesisSchema,
  },
  privateKey,
)
```

### Append events

```ts
// Publish a document
await appendBlock(chain, { content: DocumentRegister.publish({
  id: "POL-INFOSEC-001",
  title: "Information Security Policy",
  hash: "sha256:abc123...",
  version: "1.0",
  metadata: { owner: "ciso@acme.com", review_date: "2027-01-01" },
}), publicKey }, privateKey)

// Publish the new version
await appendBlock(chain, { content: DocumentRegister.publish({
  id: "POL-INFOSEC-002",
  title: "Information Security Policy",
  hash: "sha256:def456...",
  version: "2.0",
}), publicKey }, privateKey)

// Mark the old version as superseded
await appendBlock(chain, { content: DocumentRegister.supersede({
  id: "POL-INFOSEC-001",
  supersededBy: "POL-INFOSEC-002",
}), publicKey }, privateKey)

// Withdraw
await appendBlock(chain, { content: DocumentRegister.withdraw({
  id: "POL-INFOSEC-001",
  reason: "Superseded by version 2.0",
}), publicKey }, privateKey)

// Restore a withdrawn document
await appendBlock(chain, { content: DocumentRegister.restore({
  id: "POL-INFOSEC-001",
  reason: "Reinstated pending review of v2.0",
}), publicKey }, privateKey)
```

### Query state

```ts
const register = DocumentRegister.fromChain(chain)

register.get("POL-INFOSEC-001")       // Document | undefined
register.byHash("sha256:abc123...")   // Document | undefined — look up by content hash
register.all                          // Document[]
register.current                      // Document[] — status === "current"
register.superseded                   // Document[]
register.withdrawn                    // Document[]
```

### Document shape

```ts
interface Document {
  id: string
  title: string
  hash: string
  url: string | null
  version: string | null
  status: "current" | "superseded" | "withdrawn"
  supersededBy: string | null
  publishedAtBlock: number
  lastUpdatedAtBlock: number
  metadata: Record<string, string>
}
```

### All event types

| Builder | Description |
|---|---|
| `DocumentRegister.publish({ id, title, hash, version, metadata? })` | Publish a new document |
| `DocumentRegister.supersede({ id, supersededBy, reason? })` | Mark a document as superseded by another |
| `DocumentRegister.withdraw({ id, reason? })` | Withdraw a document |
| `DocumentRegister.restore({ id, reason? })` | Restore a withdrawn document |

---

## AccessList

A permission register. Tracks grants, revocations, and time-limited access with expiry tracking.

Good for: API key management, service account permissions, contractor access, feature flags.

### Create a chain

```ts
import { AccessList } from "@glorychain/structures"

const chain = createChain(
  {
    content: "Production API access register.",
    purpose: "access-control",
    creatorId: "platform-team@company.com",
    identityType: "anonymous",
    publicKey,
    contentSchema: AccessList.genesisSchema,
  },
  privateKey,
)
```

### Append events

```ts
// Grant access
await appendBlock(chain, { content: AccessList.grant({
  id: "contractor-alice",
  label: "payments-api (read-only)",
  grantedBy: "platform-lead@company.com",
  expiresAt: "2026-12-31T00:00:00Z",
  metadata: { ticket: "SEC-1042" },
}), publicKey }, privateKey)

// Revoke access
await appendBlock(chain, { content: AccessList.revoke({
  id: "contractor-alice",
  revokedBy: "platform-lead@company.com",
  reason: "Contract ended",
}), publicKey }, privateKey)

// Mark as expired
await appendBlock(chain, { content: AccessList.expire({
  id: "contractor-bob",
}), publicKey }, privateKey)
```

### Query state

```ts
const list = AccessList.fromChain(chain)

list.get("contractor-alice")          // AccessEntry | undefined
list.isGranted("contractor-alice")    // boolean — active and not expired
list.granted                          // AccessEntry[] — status === "granted"
list.revoked                          // AccessEntry[]
list.all                              // AccessEntry[]
list.stale()                          // AccessEntry[] — granted but past expiresAt (uses Date.now())
list.stale(new Date("2026-06-01"))    // AccessEntry[] — granted but past expiresAt as of given date
```

### AccessEntry shape

```ts
interface AccessEntry {
  id: string
  label: string | null
  granted: boolean           // false after REVOKE or EXPIRE
  grantedBy: string | null
  expiresAt: string | null
  grantedAtBlock: number
  lastUpdatedAtBlock: number
  metadata: Record<string, string>
}
```

### All event types

| Builder | Description |
|---|---|
| `AccessList.grant({ id, label?, grantedBy, expiresAt?, metadata? })` | Grant access |
| `AccessList.revoke({ id, revokedBy, reason? })` | Revoke access |
| `AccessList.expire({ id })` | Mark access as expired |

---

## ChangeLog

A software release register. Tracks releases, deprecations, and yanked versions. Builds a tamper-evident history of what was shipped.

Good for: package changelogs, API versioning, firmware release records, dependency audits.

### Create a chain

```ts
import { ChangeLog } from "@glorychain/structures"

const chain = createChain(
  {
    content: "payments-api release register.",
    purpose: "changelog",
    creatorId: "ci-bot@company.com",
    identityType: "anonymous",
    publicKey,
    contentSchema: ChangeLog.genesisSchema,
  },
  privateKey,
)
```

### Append events

```ts
// Record a release
await appendBlock(chain, { content: ChangeLog.release({
  version: "1.2.0",
  notes: "Add idempotency keys to payment intents. Fix retry logic on network errors.",
  tags: ["feature", "bugfix"],
  breaking: false,
  metadata: { sha: "abc1234", deployed_by: "ci@company.com" },
}), publicKey }, privateKey)

// Deprecate a version
await appendBlock(chain, { content: ChangeLog.deprecate({
  version: "1.1.0",
  reason: "Superseded by 1.2.0. End of support 2027-01-01.",
}), publicKey }, privateKey)

// Yank a version (emergency withdrawal)
await appendBlock(chain, { content: ChangeLog.yank({
  version: "1.2.1",
  reason: "Critical data loss bug. Do not use. Patch in 1.2.2.",
}), publicKey }, privateKey)
```

### Query state

```ts
const log = ChangeLog.fromChain(chain)

log.get("1.2.0")                      // Release | undefined
log.all                               // Release[] — chronological
log.active                            // Release[] — not deprecated or yanked
log.deprecated                        // Release[]
log.yanked                            // Release[]
log.breaking                          // Release[] — breaking: true
log.latest                            // Release | undefined — most recent active release
```

### Release shape

```ts
interface Release {
  version: string
  notes: string
  breaking: boolean
  status: "active" | "deprecated" | "yanked"
  successor: string | null    // set when deprecated in favour of a newer version
  yankReason: string | null
  releasedAtBlock: number
  lastUpdatedAtBlock: number
  metadata: Record<string, string>
}
```

### All event types

| Builder | Description |
|---|---|
| `ChangeLog.release({ version, notes, tags?, breaking?, metadata? })` | Record a release |
| `ChangeLog.deprecate({ version, reason? })` | Mark a version as deprecated |
| `ChangeLog.yank({ version, reason? })` | Emergency withdrawal of a version |

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

See [Programmatic API](./programmatic-api.md) and the `@glorychain/structures` source for full type signatures.
