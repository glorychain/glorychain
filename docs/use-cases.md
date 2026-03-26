# Use cases

Real-world scenarios where glorychain creates verifiable accountability.

---

## ⚖️ Civic accountability — planning decisions

**The problem:** Planning authorities make decisions that affect communities for decades. Minutes get amended. Votes get misremembered. There is rarely a tamper-evident original record.

**The chain:**
```
chain: westfield-planning-authority
signer: planning.secretary@westfield.gov.uk

Block 0   "Official public record of all planning decisions. Immutable from this point."
Block 1   "PA/2026/0042 APPROVED — 240-unit residential, North Quarter. Vote 6–2–1. Ref: councillor-pack-042.pdf"
Block 2   "PA/2026/0091 REFUSED — Change of use, 14 High Street. Vote 7–0–2."
Block 3   "PA/2026/0042 AMENDED — height reduced from 12 to 9 storeys following judicial review."
```

**What this enables:** Any resident, journalist, or councillor can verify the chain. Block 1 can never be silently deleted. Block 3 proves Block 1 happened — the amendment is on record, but so is the original decision.

**How to set this up:** The planning authority runs `glorychain init` in a GitHub repository. The secretary's keypair is the signing authority. Every decision is appended at the point of resolution.

---

## 🏛️ NGO governance — board resolutions

**The problem:** Charity boards make binding decisions about budgets, executive contracts, and governance changes. Disputes about what was agreed — or whether a quorum was present — are common and damaging.

**The chain:**
```
chain: acme-aid-board-resolutions
signer: board.chair@acme-aid.org

Block 0   "Binding board decision register. Both the Executive Director and Board Chair must co-sign."
Block 1   "RESOLUTION 2026-001: Annual budget of $2.4M approved. Unanimous (9/9). 12 Jan 2026."
Block 2   "RESOLUTION 2026-002: Safeguarding policy overhauled. Vote 8–1. Effective immediately."
Block 3   "RESOLUTION 2026-003: CEO contract renewed for 3 years. Vote 7–2. Salary band: Band 5."
```

**What this enables:** Donors, regulators, and board members can independently verify the complete decision history. Any dispute about what was resolved — or when — has a cryptographic answer.

---

## 🔧 Open source — architecture decision records

**The problem:** Engineering teams make architectural decisions that shape codebases for years. The reasons get lost. New engineers can't tell why things are the way they are. The original decision-makers leave.

**The chain:**
```
chain: hyperdb-adr
signer: core-team@hyperdb.dev

Block 0   "Architecture Decision Register. Append-only. Superseded decisions noted in later blocks."
Block 1   "ADR-001: RocksDB chosen over LevelDB. Column families required for transaction log isolation."
Block 2   "ADR-002: Single-writer model adopted. Eliminates conflict resolution at the protocol layer."
Block 3   "ADR-003: ADR-001 superseded — migrating to custom LSM. RocksDB licence incompatible with v3."
```

**What this enables:** Every architectural decision is permanently attributed to the team that made it, with the reasoning intact. New maintainers can trace the full history. Block 3 supersedes Block 1 — but Block 1 still exists, with its original reasoning.

---

## 📋 Political accountability — policy commitments

**The problem:** Politicians make commitments. Later, they deny making them, claim they voted differently, or quietly reverse position. There is rarely a binding, verifiable record.

**The chain:**
```
chain: sen-maya-rodriguez-climate-register
signer: senator.rodriguez@senate.gov

Block 0   "I am creating this chain as a permanent public record of my climate votes and commitments."
Block 1   "VOTED YES — Clean Energy Transition Act (SB-412). Passed 52–48. 3 Feb 2026."
Block 2   "COMMITTED — Net zero target for district by 2035. rodriguez.senate.gov/2026/02/netzero"
Block 3   "VOTED NO — Carbon Border Adjustment waiver (SB-519). Failed 41–59. 14 Mar 2026."
```

**What this enables:** Constituents, journalists, and advocacy groups can verify the complete voting record. The chain is signed by the senator's keypair — it is permanently attributable to them. No press team can rewrite it.

---

## 🏢 Corporate governance — appointments and reporting structure

**The problem:** Personnel changes, reporting lines, and executive appointments are often documented in systems that can be edited or deleted. Disputes about authority, seniority, or chain of command are hard to resolve.

**The chain:**
```
chain: acme-corp-members
signer: coo@acme.com

Block 0   "Canonical membership and reporting structure for Acme Corp."
Block 1   "APPOINT: Sarah Chen → Chief Executive Officer. Effective 1 Jan 2026."
Block 2   "APPOINT: James Okafor → VP Engineering, reports to: Sarah Chen."
Block 3   "APPOINT: Liu Wei → Staff Engineer, reports to: James Okafor."
Block 4   "PROMOTE: Liu Wei → Principal Engineer. Approved by: Sarah Chen."
Block 5   "DEPART: James Okafor. Direct reports reassigned to: Sarah Chen (interim)."
```

**What this enables:** HR, legal, and regulators have a tamper-evident record of every appointment and departure. Disputes about seniority, authority, or reporting lines have a cryptographic audit trail.

---

## 🖥️ DevOps — production deployment audit trail

**The problem:** Production incidents often require reconstructing a timeline of deployments and config changes. This reconstruction usually involves piecing together logs from multiple systems, none of which are tamper-evident.

**The chain:**
```
chain: payments-api-audit
signer: deploy-bot@company.com

Block 0   "Automated audit trail. All deploys and config changes appended by CI. Human approvals noted."
Block 1   "DEPLOY v2.14.1 — fix: rate limit off-by-one. SHA: a3f9c12. Triggered: jane.smith@company.com"
Block 2   "CONFIG: rate_limit_multiplier 1.0 → 1.5. Approved: oncall-lead@company.com. Incident: INC-4821"
Block 3   "ROLLBACK to v2.14.0 — p99 latency spike post-deploy. Triggered: auto-rollback. 03:17 UTC"
```

**What this enables:** When the auditors come, or when an incident needs a post-mortem, the chain speaks for itself. Every change is timestamped, attributed, and hash-linked. Nothing can be quietly removed.

---

---

## 💻 Developer tooling — architecture decision records (structured)

**The problem:** Engineering teams make architectural decisions that shape codebases for years. The reasons get lost. New engineers can't tell why things are the way they are.

**Before glorychain:** ADRs live in a wiki that anyone can edit. The original decision and its rationale quietly drift as the page gets updated.

**With glorychain:**

```bash
glorychain init \
  --name "API Platform Architecture Decisions" \
  --purpose "Immutable record of all architecture decisions for the API platform team."
```

Each ADR is a signed, schema-validated block:

```json
{
  "title": "Use tRPC for internal API layer",
  "status": "Accepted",
  "decision": "Adopt tRPC v11 for all client-server communication.",
  "rationale": "End-to-end type safety eliminates an entire class of runtime errors.",
  "consequences": "All API consumers must use the TypeScript client.",
  "author": "finn@glorychain.io"
}
```

**What you can now prove:** Every ADR is permanently attributed to its author, timestamped, and hash-linked. A superseded decision still exists — with its original rationale — because blocks cannot be deleted.

---

## ⚙️ DevOps — production service config audit log (structured)

**The problem:** Production config changes are made by multiple people across multiple systems. When something breaks at 3am, reconstructing what changed and when is painful.

**Before glorychain:** Config changes live in environment variables, Kubernetes secrets, or a shared spreadsheet — none of which have a tamper-evident history.

**With glorychain:**

```bash
glorychain init \
  --name "Production Service Config" \
  --purpose "Tamper-evident audit log of all configuration changes to production services."
```

Every change is an append-only event:

```json
{ "type": "SET", "key": "api.rate_limit.requests_per_minute", "value": "500" }
```

The chain gives you a complete, ordered history of every SET and DELETE — who made it, when, and what the value was before.

**What you can now prove:** During a post-mortem, the chain is the authoritative timeline. No one can quietly revert a change and pretend it didn't happen.

---

## 👥 HR / ops — team membership register (structured)

**The problem:** Who is on the team? When did they join? When did they leave? Who approved the role change? These questions are surprisingly hard to answer from most HR systems.

**Before glorychain:** Spreadsheets, Notion pages, or HR software — all editable, none with cryptographic history.

**With glorychain:**

```bash
glorychain init \
  --name "Platform Team Roster" \
  --purpose "Authoritative membership registry for the platform engineering team."
```

Every join, departure, and role change is a signed event:

```json
{ "type": "JOIN",        "id": "alice@glorychain.io", "name": "Alice Chen", "role": "Senior Engineer" }
{ "type": "ROLE_CHANGE", "id": "bob@glorychain.io",   "role": "Senior Engineer" }
{ "type": "LEAVE",       "id": "alice@glorychain.io",  "reason": "Moved to new role at Stripe" }
```

**What you can now prove:** At any point in time you can replay the chain to reconstruct the exact team composition. Audit requests — from legal, compliance, or regulators — have a cryptographic answer.

---

## 🏢 Engineering org structure (structured)

**The problem:** Reporting lines and seniority decisions are made informally and recorded in systems that can be edited. Disputes about authority or chain of command are hard to resolve.

**Before glorychain:** The org chart lives in Notion or Workday — both editable, neither verifiable.

**With glorychain:** Use the `OrgTree` structure to maintain a live, replayable org chart on-chain:

```typescript
import { OrgTree } from "@glorychain/structures";

const tree = OrgTree.fromChain(chain);

tree.get("bob@glorychain.io");           // OrgMember { role: "Staff Engineer", ... }
tree.directReports("finn@glorychain.io") // [Alice Chen, Bob Okafor]
tree.pathTo("yuki@glorychain.io")        // [Finn → Alice → Yuki]
```

Events on the chain:

```json
{ "type": "APPOINT", "id": "alice@glorychain.io", "name": "Alice Chen", "role": "Engineering Manager", "reportsTo": "finn@glorychain.io" }
{ "type": "PROMOTE", "id": "bob@glorychain.io",   "role": "Staff Engineer", "reportsTo": "finn@glorychain.io" }
```

**What you can now prove:** Every appointment, promotion, and transfer is permanently on record. The org chart at any point in history can be reconstructed by replaying the chain to that block.

---

## Have a use case to share?

We want to hear about chains people are building in the real world. [Open a discussion](https://github.com/finnfitzsimons3/glorychain/discussions) or [file an issue](https://github.com/finnfitzsimons3/glorychain/issues) with the `use-case` label.
