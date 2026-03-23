---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
inputDocuments:
  - planning_artifacts/product-brief-glory-chain-2026-03-22.md
  - planning_artifacts/brainstorming/brainstorming-session-2026-03-22.md
workflowType: 'prd'
briefCount: 1
brainstormingCount: 1
researchCount: 0
projectDocsCount: 0
classification:
  projectType: developer_tool + saas_b2b + api_backend
  domain: general (civic/transparency adjacency)
  complexity: high
  projectContext: greenfield
  prdStructure: two-part (Protocol & Library first, SaaS Platform second)
  designConstraint: platform neutrality is non-negotiable
  connectorInterface: public API contract with versioning and backwards compatibility guarantees
---

# Product Requirements Document - Glory Chain

**Author:** Finn
**Date:** 2026-03-22

## Executive Summary

Glory Chain is the transparency layer of the internet — an open protocol for verifiable institutional truth. It is a lightweight, censorship-resistant blockchain protocol that enables any individual, organisation, or community to create an immutable, cryptographically signed chain of records anchored to a declared genesis of intent. Every block appended is tamper-evident and permanently attributable. No block can be silently edited or removed.

The platform is a notary, not a judge. It guarantees cryptographic integrity without evaluating content. Judgment belongs to the reader. This neutrality is a non-negotiable design constraint — not a preference — making Glory Chain safe for use in politically sensitive, civically critical, and adversarial contexts.

**Absence of a chain is as legible as the chain itself.** Institutions adopt Glory Chain not because the platform compels them, but because their audiences expect it — and because silence has consequences. The cultural driver is consumer demand, not platform pressure.

Glory Chain ships as three composable surfaces in dependency order across two sequential MVPs:

- **Protocol & Library** *(MVP 1 — ships first)* — open source, self-hostable, permissionless to build on. `@glory-chain/core` and a family of connector modules built against a versioned, backwards-compatible public API contract. The foundation everything else depends on.
- **CLI** *(MVP 1 — ships with protocol)* — local chain creation, appending, verification, and forking without any service dependency. The developer entry point.
- **SaaS Platform** *(MVP 2 — ships immediately after)* — OAuth-authenticated identity, named chain slugs, web UI for non-technical institutional creators, and tiered API access. The institutional on-ramp.

The protocol is designed to be built on top of — not just used. It is a permissionless substrate for an ecosystem of verifiable record products. A chain created today with no specific module in mind can be reinterpreted by a module that doesn't exist yet. Future utility without future-proofing.

---

## What Makes This Special

**Neutral by design.** The platform never rates, filters, or ranks chains. It witnesses and preserves — nothing more. This makes it the first transparency infrastructure safe for institutional adoption in adversarial political contexts.

**Consumer-driven adoption.** The primary beneficiary is the Demander — the journalist, watchdog, or community member who cites chains as evidence. Demanders create social pressure that drives institutional adoption without any sales motion from Glory Chain.

**Fork model resilience and credibility.** Compromise doesn't destroy a chain — it creates visible lineage. Any observer can fork a chain from any block, preserving history up to that point. A chain that has never been forked carries implicit community endorsement — a credibility signal consumers can read. Forks are audit signals, not attacks.

**Persistence-agnostic.** Chains live wherever they were born. Migration is a last resort that leaves a permanent provenance scar. The connector interface is a versioned public API contract with backwards compatibility guarantees — any persistence target can be supported by any third party, and businesses can safely build on top of it.

**RSS-native distribution.** Every chain exposes an RSS/Atom feed. Consumers use any RSS reader. The open web — including the Internet Archive — passively archives public chains without platform effort.

**Open core permanence.** The protocol is unstoppable even if the SaaS disappears. Self-hosting is fully supported and deliberately unsabotaged.

**Why now:** Lightweight cryptographic tooling is mature enough to build a simple chain without a PhD. GitHub and RSS are ubiquitous free persistence and distribution layers. The open source ecosystem is sophisticated enough for a small team to ship a credible protocol. The technology finally caught up to the problem.

---

## Project Classification

- **Type:** Hybrid — developer tool (library, CLI, connector SDK) + SaaS B2B (web platform, OAuth, teams) + API backend (tiered access product)
- **Domain:** General software with civic/transparency adjacency — no regulatory compliance requirements, but designed for politically sensitive and adversarial contexts
- **Complexity:** High — novel protocol design where the spec is the product; cryptographic identity model, fork mechanics, and connector threat detection each carry non-trivial engineering risk
- **Context:** Greenfield
- **PRD Structure:** Two parts — Part 1: Protocol & Library; Part 2: SaaS Platform

---

## Success Criteria

### User Success

| User | Success Criteria |
|------|-----------------|
| Demander | Chain permalink returns identical, verifiable content 1 year after creation. RSS feed delivers new blocks within 5 minutes of appending. Block permalink is citable in published work with no account required to view. |
| Willing Demonstrator | First block appended within 15 minutes of account creation. Chain publicly accessible immediately after creation. Ongoing append cadence maintained — at least one block per 30 days indicates active use. |
| Reluctant Demonstrator | Chain created and publicly visible without technical knowledge. Onboarding completable in under 20 minutes with no support required. |
| Builder | Zero-to-first-chain under 1 hour using only npm package and public docs. Zero-to-first-independently-verified-chain under 1 day. Library works across Node.js LTS versions without runtime surprises. |
| Forker | Fork from any block completable in under 10 minutes. Forked chain preserves full original history with visible divergence point. Fork is publicly readable immediately. |

---

### Business Success

**3-Month Targets**
- Protocol spec published and independently verified by at least one external developer building against it without assistance
- Connector interface standard validated by one community-built connector
- `@glory-chain/core` published on npm with file + GitHub connectors
- 100 public chains created
- SaaS early access live with first 10 institutional creators onboarded

**12-Month Targets**
- 1,000+ active public chains (active = block appended in last 30 days)
- At least one credible institution publicly citing their Glory Chain in official communications
- Paid SaaS tier live with first paying customers
- At least one community-built connector in the registry
- At least one successful public fork event — resilience model proved in practice
- Chain citation rate measurable via referrer analytics — at least 50 external citations of chain permalinks

---

### Technical Success

- Protocol spec is complete, stable, and independently implementable — a third party can build a compatible chain engine from the spec alone
- Connector interface is versioned with documented backwards compatibility guarantees
- Chain verification is deterministic — same chain + same blocks = same verification result, always, on any runtime
- No single point of failure — a chain stored on GitHub remains readable and verifiable if Glory Chain SaaS goes offline permanently
- Fork operation preserves complete original history with no data loss
- RSS feed is valid Atom/RSS, parseable by any standard reader

---

### Measurable Outcomes (KPIs)

**North Star:** Chain append frequency — % of chains with at least one block in last 30 days *(activity beats creation volume)*

**Growth:** Chains created per week · New SaaS accounts per week · npm downloads of `@glory-chain/core`

**Consumer Engagement (Demander Flywheel):** Public chain read requests per week · RSS subscriber count across public chains · Chain citation rate via referrer analytics *(leading indicator of flywheel activation)*

**Developer Adoption:** Time to first verified chain *(DX benchmark)* · Community connector count · npm download growth rate

**Ecosystem Health:** % of chains never migrated *(stability)* · Fork events per quarter *(resilience — target ≥1 in year one)* · % of chains with active RSS subscribers

---

## Product Scope

Full phased feature breakdown, success gates, and risk mitigation are documented in [Project Scoping & Phased Development](#project-scoping--phased-development).

**MVP 1 Success Gate:** External developer builds a working, publicly verifiable chain using only the public spec and npm package without assistance.

**MVP 2 Success Gate:** Non-technical user creates and publishes a public chain without assistance. At least one real chain cited externally in the wild.

---

## User Journeys

### Journey 1: The Demander — Layla's Investigation

Layla is three months into investigating a city council's planning decisions around a controversial development. She has screenshots, archived pages, and a folder of PDFs — but every time she publishes a finding, the council's spokesperson says the document she cited has been "superseded" or "misread." She can prove what the document said, but she can't prove it hasn't been modified since she downloaded it.

A colleague mentions Glory Chain in passing — "it's like a notary for institutional records." Layla opens the council's chain URL from a link in another journalist's article. No signup required. She sees a chronological list of blocks going back 18 months — planning decisions, meeting minutes, policy statements. Each block has a timestamp, a hash, and a permalink.

She clicks the permalink for a planning approval from 8 months ago. The block loads instantly — the same URL, the same content, verifiable against the chain hash. She copies the permalink into her article. The council cannot dispute it. The block is permanent.

Three weeks later, she notices the chain went silent — no new blocks for 6 weeks, starting exactly when the council came under scrutiny. She publishes that observation too. The silence is the story.

**Capabilities revealed:** Public chain read experience with no account required · Block permalinks — stable, shareable, permanent · RSS feed for new block notifications · Chain silence visibility — timestamp of last block always visible · Referrer analytics for citation tracking

---

### Journey 2: The Willing Demonstrator — Marcus Goes Public

Marcus's NGO board has approved the decision to publish their governance decisions publicly. He's been given the task. He's not a developer but he's comfortable with technology — he manages their GitHub and Google Workspace.

He signs up for Glory Chain SaaS with his Google account. The onboarding asks him to create a genesis block — the founding statement of his organisation's transparency chain. He types a paragraph describing the NGO's mission and governance principles. He sets the chain to public. He clicks publish. The chain is live in under 10 minutes.

Two weeks later, after a board meeting, he opens the SaaS dashboard and clicks "Append Block." He pastes in the meeting resolution — funding approved for a new project, three board members in favour, one abstention. He clicks sign and publish. The block appears on the chain within seconds.

Six months later, a donor emails him unprompted. She's been following the chain via RSS. She's renewing their grant — the chain was a factor. Marcus forwards the email to the board.

**Capabilities revealed:** OAuth signup (Google) · Genesis block creation via web UI · Public chain toggle · Block append via web UI with owner signing · Dashboard showing chain state · RSS feed auto-generated · Named chain slug for sharing

---

### Journey 3: The Reluctant Demonstrator — Diane Under Pressure

A civic transparency coalition has publicly named Diane's city council as one of three local governments that still have no public accountability chain. The story ran in two local papers. Her director has asked her to "sort it out this week."

Diane opens Glory Chain SaaS. She's relieved it has a Google login — no new password. The onboarding walks her through a template genesis block: "This chain represents the official public record of planning decisions by [Council Name]." She edits the template, adds the council's name and a link to their official website, and publishes.

She delegates block appending to her junior communications officer, who she adds as an approved editor. She emails the coalition with the chain URL. Within 48 hours, the coalition updates their list — the council is now marked compliant.

She never touches the chain again. Her comms officer appends a block after each council meeting. The chain runs itself.

**Capabilities revealed:** Template genesis blocks for common institution types · Delegated editor access (team feature — post-MVP) · Onboarding with zero technical knowledge required · Council/org official website link in genesis · Public chain URL for sharing · Simplified block append for non-technical editors

---

### Journey 4: The Builder — Sofia's Governance Platform

Sofia is building a governance tool for neighbourhood associations. She needs a tamper-evident audit trail for votes and membership changes. She finds `@glory-chain/core` on npm while searching for "audit log blockchain npm."

She installs the package, reads the quickstart, and has a working chain on her local filesystem in 40 minutes. She switches to the GitHub connector — her clients' chains will live in private repos they control. She writes a thin wrapper that calls `glory-chain append` when a vote is recorded in her platform.

A month after launch, a neighbourhood association member challenges a vote result. Sofia's client opens the chain, finds the vote block, copies the permalink, and shares it with the challenger. The block shows the vote timestamp, the voter count, and the hash of the previous block. The challenge is resolved without Sofia's involvement.

Two months later, Sofia gets a support ticket: "Can we verify our chain independently, without using your platform?" She points them to the Glory Chain CLI and the public spec. They run `glory-chain verify` against their GitHub-hosted chain. It passes. The ticket closes with a five-star rating.

**Capabilities revealed:** `@glory-chain/core` npm package · GitHub connector · File system connector · `glory-chain append` CLI command · `glory-chain verify` CLI command · Public spec — independently implementable · Block permalinks accessible without platform · Connector interface standard (versioned)

---

### Journey 5: The Forker — A Community Rescues a Compromised Chain

A well-known open source project has maintained a public Glory Chain for two years — architectural decisions, contributor agreements, governance votes. The chain has 847 blocks and is cited in dozens of academic papers.

The project's founder sells the company to a large corporation. Three weeks later, new blocks appear on the chain — blocks that contradict previous governance decisions. The community notices immediately via RSS. A prominent contributor, Ibrahim, opens the chain and identifies block 831 as the last trustworthy block — the day before the acquisition closed.

Ibrahim installs the CLI. He runs `glory-chain fork --from 831 --chain <original-chain-id>`. The command creates a new chain whose genesis references the original chain and the fork point, preserving all 831 blocks as provenance. Ibrahim publishes the fork URL to the community forum with a brief explanation.

Within 24 hours, the academic papers that cited the original chain are updated with a note pointing to Ibrahim's fork. The original chain continues to exist — visibly compromised. The fork carries the community's trust.

**Capabilities revealed:** `glory-chain fork --from <block>` CLI command · Fork genesis references original chain ID and fork point · Full history preserved in forked chain · Fork is immediately publicly readable · Original chain shows known forks · Fork event visible in chain metadata

---

### Journey Requirements Summary

| Capability Area | Revealed By |
|----------------|------------|
| Public chain read — no account required | Layla, Sofia's clients, Ibrahim's community |
| Block permalinks — stable, permanent | Layla, Ibrahim |
| RSS feed — per chain, auto-generated | Layla, Marcus |
| Chain silence visibility — last block timestamp | Layla |
| Referrer analytics on chain URLs | Layla (flywheel tracking) |
| OAuth signup (Google, GitHub) | Marcus, Diane |
| Genesis block creation — template + freeform | Marcus, Diane |
| Block append via web UI with owner signing | Marcus, Diane |
| Named chain slug | Marcus, Diane |
| `@glory-chain/core` npm package | Sofia |
| GitHub connector | Sofia |
| File system connector | Sofia |
| `glory-chain append` CLI | Sofia, Ibrahim |
| `glory-chain verify` CLI | Sofia |
| `glory-chain fork --from <block>` CLI | Ibrahim |
| Public spec — independently implementable | Sofia, Ibrahim |
| Fork genesis references original + fork point | Ibrahim |
| Fork immediately publicly readable | Ibrahim |
| Original chain shows known forks | Ibrahim |
| Connector interface standard — versioned | Sofia, all builders |
| Delegated editor access | Diane *(post-MVP)* |
| Template genesis blocks | Diane |

---

## Domain-Specific Requirements

### Political Neutrality — Architectural Constraint

The platform will be used by actors across the political spectrum, including organisations hostile to each other. The system must be architecturally incapable of discrimination. No content filtering, ranking, de-platforming mechanism, or credibility signal exists in the core protocol. This is a design constraint baked into the spec — not a policy that can be reversed under pressure.

### Cryptographic Standards

**Defaults (configurable):**
- Hashing: **SHA-256**
- Signing: **Ed25519**

Both are well-audited, widely supported across languages, and appropriate for this use case. The block schema includes `hashAlgorithm` and `signatureScheme` fields with these as defaults. Configurable to support algorithm migration without breaking the spec.

**Replay attack prevention:** The chain ID must be included in the signed payload of every block. A block signed for chain A is cryptographically invalid on chain B. This is a spec-level security requirement — not a platform feature.

**Verification determinism:** Same chain + same blocks = same verification result on any runtime, any language, any implementation. The spec must be precise enough to guarantee this.

### Key Management

Two custody paths — both documented, both valid, tradeoffs explicit:

**Self-custody path:** Creator generates and holds their own keypair. Glory Chain never sees the private key. Creator bears full risk — lost key means permanently frozen chain (no more appends), compromised key means fraudulent appends possible. CLI tooling provides key generation guidance.

**SaaS-custody path:** Glory Chain SaaS manages key custody on behalf of the user. Simplifies onboarding for non-technical creators. Reintroduces centralisation risk — creator trusts Glory Chain not to misuse signing authority. Documented explicitly in SaaS terms of service.

Both paths are disclosed at genesis creation. Users choose knowingly.

### Data Permanence and Right to Erasure

Public chains are designed to be permanent and uneditable — this is the core value proposition. In jurisdictions with right-to-erasure requirements (GDPR Article 17), this creates tension.

**Platform position:**
- The SaaS can stop hosting a chain upon valid erasure request — the chain URL becomes unreachable from Glory Chain infrastructure
- The protocol cannot guarantee erasure from third-party mirrors, RSS archivers, forks, or the Internet Archive
- This limitation is disclosed at genesis creation — users publishing public chains consent to permanent record-keeping by design

Private chains on the SaaS are fully deletable from Glory Chain infrastructure.

### Adversarial Actor Model

**Impersonation chains:** Mitigated by off-platform address canonicalization — institutions publish their official chain address through their own trusted channels. The platform provides no discovery index, so impersonator chains are naturally invisible unless actively linked to.

**Spam chains:** Mitigated by the 3-chain free tier and paid creation friction. A determined paid actor can create spam chains — but without a platform discovery index or featured chains list, spam chains have no organic reach. Discoverability is entirely off-platform by design.

**Chain compromise:** Mitigated by the fork model. A compromised chain creates visible lineage — the community can fork from the last trusted block and the compromise is publicly documented.

**No platform discovery index:** Glory Chain does not maintain a searchable index of all chains, a featured chains list, or any algorithmic ranking. This is a deliberate architectural choice — it eliminates the attack surface of discovery manipulation and means spam chains are invisible by default.

---

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Transparency Infrastructure as a Protocol Layer**
No lightweight, open, purpose-built protocol exists for institutional transparency records. Bitcoin/Ethereum solve financial consensus. Git solves code versioning. Glory Chain occupies an unoccupied niche: a simple, append-only, cryptographically signed record layer designed specifically for institutional accountability. The innovation is the restraint — a blockchain that deliberately does less.

**2. Asymmetric Two-Sided Network Effect**
Glory Chain is architected around a two-sided network effect with an unusual asymmetry: Demanders (consumers) create adoption pressure on Demonstrators (creators), not the reverse. The value of each chain increases as more Demanders cite it, which increases pressure on more institutions to create chains, which creates more value for Demanders. Critically, the supply side (Demonstrators) doesn't benefit from network effects directly — they benefit from social legitimacy pressure. This determines the seeding strategy: **acquire Demanders first, always**. The act of citing a chain permalink is simultaneously product use and distribution.

**3. Chain-as-Substrate with Retroactive Interpretability**
A chain created today with no specific data structure in mind can be reinterpreted by a module that doesn't exist yet. The separation of the chain (append-only storage) from the module (schema and interpretation layer) means the protocol accumulates value over time without requiring migration or updates to existing chains. **Validation during MVP 1:** a tree structure module built in week 3 of development must successfully reinterpret chains created in week 1. Failure here invalidates the architectural claim before launch.

**4. Resilience Through Visible Lineage**
Most systems treat compromise as a failure state requiring restoration. Glory Chain treats compromise as a data point — the fork creates a permanent, public record of what changed and when. A chain that has been forked carries more information than one that hasn't. A chain that has never been forked carries implicit community endorsement. Resilience is achieved not by preventing bad actors but by making their actions permanently legible.

**5. Connector-Owned Threat Intelligence at the Edge**
Treating storage as a pluggable layer where each connector owns its own threat detection logic is architecturally novel. Most distributed systems centralise failover and redundancy coordination. Glory Chain inverts this — the GitHub connector knows what "repo deleted" means; the file connector knows what "file missing" means; the IPFS connector knows what "pin dropped" means. Threat intelligence lives at the edge, scales with the connector ecosystem, and requires zero central coordination cost.

**6. RSS as Zero-Infrastructure Distribution Primitive**
Most blockchain projects build custom explorers, notification systems, and indexing infrastructure. Glory Chain delegates all of that to RSS — a 25-year-old open standard with massive existing tooling, archiving infrastructure, and user adoption. Using RSS as the native distribution layer eliminates entire product surface areas: no notification system, no explorer UI for consumers, no indexing pipeline. The Internet Archive crawls RSS feeds automatically — public chains get permanently archived without platform effort. This is infrastructure innovation through deliberate subtraction.

---

### Market Context & Competitive Landscape

- **Blockchain projects** (Ethereum, Hyperledger) — too heavy, too expensive, built for financial consensus not institutional records
- **Git/GitHub** — versioning without social convention of a record, no identity guarantees, no fork-as-audit-signal model
- **Centralised transparency platforms** (OpenSecrets, Transparify) — domain-specific, editable, platform-controlled
- **Notarisation services** — expensive, slow, not programmatically accessible, not designed for ongoing append
- **No existing product** occupies the lightweight, open protocol, institutional transparency, consumer-demand-driven niche

**Strategic partnership opportunities** *(not competitors — potential power users and distribution channels):*
- **OCCRP** (Organised Crime and Corruption Reporting Project) — investigative journalism infrastructure; a Glory Chain integration would be a significant legitimacy signal
- **OpenCorporates** — largest open database of companies globally; chains as verifiable corporate record layer
- **Follow the Money** — financial transparency NGO; chains as audit trail layer
- **Journalism NGOs broadly** — natural Demander communities with existing audiences who expect institutional accountability

---

### Validation Approach

- **MVP 1 gate** validates protocol innovation: external developer implements compatible chain engine from spec alone without assistance
- **MVP 1 internal gate** validates retroactive interpretability: tree structure module built in week 3 successfully reinterprets chains from week 1
- **MVP 2 gate** validates adoption model innovation: non-technical institutional creator onboards without assistance; chain cited externally in the wild
- **12-month signal**: at least one credible institution adopts because their audience demanded it — not because Glory Chain sold to them

---

### Risk Mitigation

| Innovation Risk | Mitigation |
|----------------|-----------|
| Protocol too simple to be credible | External cryptographic audit before public launch; independent implementation by third party as MVP 1 gate |
| Consumer-demand flywheel never activates | Seed initial Demander community through journalism and civic tech circles; target one high-profile chain citation in first 6 months; pursue OCCRP/journalism NGO partnerships early |
| Connector ecosystem doesn't materialise | Ship two official connectors (fs + GitHub) with rock-solid DX; publish connector interface as first-class open standard |
| Retroactive interpretability proves fragile | Test with tree structure module during MVP 1 development — not post-launch; include schema versioning in block metadata from day one |
| RSS proves insufficient for institutional use cases | RSS is supplemented by direct chain URL sharing and block permalinks — RSS is distribution, not the only access path |

---

## Technical Architecture Requirements

### Developer Tool — Library & CLI

**Language Matrix**
- Primary: TypeScript/JavaScript (Node.js) — npm-first
- Protocol spec is language-agnostic — any language can implement a compatible chain engine
- Official connectors ship in TypeScript; community connectors may use any language
- Target: Node.js LTS versions (current + previous)

**Installation Methods**
```bash
npm install @glory-chain/core
npm install @glory-chain/fs        # file system connector
npm install @glory-chain/github    # github connector
npm install -g glory-chain         # CLI global install
```

**API Surface — Core Library**

```typescript
// Chain lifecycle
createChain(genesis: GenesisBlock, options: ChainOptions): Chain
appendBlock(chain: Chain, content: BlockContent): Block
verifyChain(chain: Chain): VerificationResult
forkChain(chain: Chain, fromBlock: number): Chain

// Connector interface (versioned public API contract)
interface Connector {
  read(chainId: string): Promise<Chain>
  write(chain: Chain): Promise<void>
  watch(chainId: string): AsyncIterator<ThreatEvent>
  migrate(chainId: string, target: Connector): Promise<void>
  verify(chainId: string): Promise<VerificationResult>
}

// Verification result — typed
interface VerificationResult {
  valid: boolean
  errors: ErrorCode[]
  blockCount: number
  lastVerifiedBlock: number
}

// RSS output
generateFeed(chain: Chain): AtomFeed
```

**CLI Command Structure**
```bash
glory-chain create --genesis <content> [--connector fs|github] [--algo sha256]
glory-chain append <chain-id> --content <content>
glory-chain verify <chain-id>
glory-chain fork <chain-id> --from <block-number> [--reason <text>]
glory-chain migrate <chain-id> --to <connector>
glory-chain feed <chain-id>          # output RSS/Atom feed
glory-chain keygen                   # generate keypair + MANDATORY key custody warning
glory-chain inspect <chain-id>       # human-readable: metadata, block count, last block, migration history, known forks, verification status
glory-chain export <chain-id>        # export chain as JSON
```

**`glory-chain keygen` — Key Custody Warning (mandatory, cannot be suppressed)**
```
⚠️  KEY CUSTODY WARNING
Your private key is the only way to append blocks to your chain.
Lost key = chain permanently frozen (no further appends possible).
Compromised key = attacker can append fraudulent blocks.
Store your private key securely. Glory Chain cannot recover it.
```

**Migration Guide**
- Protocol versioning in block schema — `protocolVersion` field
- Backwards compatibility: older blocks readable by newer implementations
- Migration path documented when breaking changes introduced (RFC required)

---

### SaaS B2B — Platform

**Tenant Model**
- Single-tenant data model — each user account is isolated
- Chains belong to the creator's account
- No cross-tenant chain sharing at the platform level (chains are public URLs, not platform shares)
- Post-MVP: org accounts with multiple members

**RBAC Matrix**

| Role | Create Chain | Append Block | View Chain | Approve Suggestion | Submit Suggestion | Manage Account |
|------|-------------|--------------|------------|-------------------|------------------|----------------|
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Editor *(post-MVP)* | — | ✓ | ✓ | — | ✓ | — |
| Suggester (any public user) | — | — | ✓ (public chains) | — | ✓ | — |
| Public (no account) | — | — | ✓ (public chains) | — | — | — |

**Subscription Tiers**

| Tier | Chains | API Access | Price |
|------|--------|------------|-------|
| Free | 3 | None | $0 |
| Pro | Unlimited | Limited (rate-limited) | TBD |
| Org *(post-MVP)* | Unlimited | Generous | TBD |
| API Product *(post-MVP)* | N/A | Unlimited + SLA | TBD |

**Pricing Philosophy:** Reading is always free — no auth, no paywall, no rate limit on public chain reads (CDN-cacheable). Chains are priced on creation beyond the free tier. API access scales with subscription tier. The business model never creates a paywall between a chain and its consumers.

**Integration List**
- OAuth: GitHub, Google (MVP 2)
- GitHub connector: read/write chains to GitHub repos
- RSS: standard Atom/RSS output consumable by any reader
- GitHub Pages: auto-generated public read URL for GitHub-hosted chains

---

### API Backend — Data Schemas & Contracts

**Auth Model**
- SaaS API: OAuth token (GitHub/Google) + API key for programmatic access
- Protocol: keypair signing — no platform auth required for chain verification
- Public chains: no auth required to read or verify

**Data Schemas — Core**

```typescript
// Chain Metadata (stored alongside blocks, not in blocks)
interface ChainMetadata {
  chainId: string
  createdAt: ISO8601
  protocolVersion: string
  hashAlgorithm: string       // default: 'sha256'
  signatureScheme: string     // default: 'ed25519'
  migrationHistory: MigrationEvent[]  // provenance scar — every move recorded
  knownForks: ForkReference[]
  transferHistory: TransferEvent[]    // reserved: [] in MVP, enables future ownership transfer
}

// Genesis Block
interface GenesisBlock {
  blockNumber: 0
  chainId: string
  creatorId: string           // declared identity — optional, not verified by platform
  content: string
  timestamp: ISO8601
  publicKey: string
  signature: string           // signs: chainId + content + timestamp
  protocolVersion: string
}

// Block
interface Block {
  blockNumber: number
  chainId: string             // included in signature — prevents replay attacks
  content: string
  timestamp: ISO8601
  previousHash: string
  hash: string
  signature: string           // signs: chainId + blockNumber + content + previousHash
}

// Fork Genesis
interface ForkGenesisBlock extends GenesisBlock {
  forkOf: string              // original chainId
  forkFromBlock: number       // block number of divergence
  forkReason?: string         // optional — e.g. 'maintainer key compromised'
}

// Migration Event
interface MigrationEvent {
  fromConnector: string
  toConnector: string
  timestamp: ISO8601
  reason?: string
}
```

**Error Codes**

| Code | Description |
|------|-------------|
| `INVALID_SIGNATURE` | Block signature doesn't verify against public key |
| `BROKEN_CHAIN` | `previousHash` doesn't match preceding block hash |
| `REPLAY_DETECTED` | `chainId` in signature doesn't match chain |
| `ALGORITHM_UNSUPPORTED` | `hashAlgorithm` or `signatureScheme` not supported |
| `CHAIN_NOT_FOUND` | Chain doesn't exist at connector |
| `KEY_MISMATCH` | Block signed with different key than genesis |
| `FUTURE_TIMESTAMP` | Block timestamp is in the future — rejected |
| `DUPLICATE_BLOCK` | Same content + same `previousHash` + same `chainId` detected |

**Rate Limits** *(SaaS API)*

| Tier | Read | Append |
|------|------|--------|
| Free | No API access | No API access |
| Pro | 100 req/min | 10 appends/min |
| Org | 1,000 req/min | 60 appends/min |
| Public chain reads (unauthenticated) | Generous (CDN-cacheable) | N/A |

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Platform MVP — the minimum surface that makes the protocol *observable* and *citable*. MVP 1 proves the protocol works and can be built on independently. MVP 2 unlocks the consumer-demand flywheel by giving non-technical institutional creators an on-ramp and giving Demanders readable public URLs to cite.

**Resource Requirements:** Solo founder + open source community. MVP 1 is buildable solo. MVP 2 requires minimal backend + OAuth integration. No dedicated ops until post-MVP 2.

---

### MVP Feature Set (Phase 1) — Protocol & Library

**Core User Journeys Supported:**
- Builder: zero-to-first-verified-chain under 1 hour using `@glory-chain/core`
- Demander (passive): read and verify any chain published to GitHub Pages without account

**Must-Have Capabilities:**
- Chain engine: `create`, `append`, `verify`, `sign`, `fork`
- Genesis + block schema — stable, documented, independently verifiable
- File system connector (`@glory-chain/fs`)
- GitHub connector (`@glory-chain/github`) — with GitHub Pages auto-generation for public read URLs
- Connector threat detection: `watch` + `migrate` events
- CLI: `create`, `append`, `verify`, `fork`, `migrate`, `feed`, `keygen`, `inspect`, `export`
- `@glory-chain/core` published to npm — public, modular, versioned
- RSS/Atom feed output — every chain exposes a feed
- Configurable crypto: `hashAlgorithm` (default: `sha256`) + `signatureScheme` (default: `ed25519`)
- Replay attack prevention: `chainId` in every signed payload

**MVP 1 Success Gate:** An external developer builds a working, publicly verifiable chain using only the public spec and npm package — without asking for help.

---

### MVP Feature Set (Phase 2) — SaaS Platform

**Core User Journeys Supported:**
- Willing Demonstrator: first block appended within 15 minutes of signup
- Reluctant Demonstrator: chain created and visible without technical knowledge
- Demander: follows chains via RSS, cites block permalinks in published work

**Must-Have Capabilities:**
- OAuth login (GitHub, Google)
- Create chain via web UI
- Append block via web UI
- Named chain slugs — human-readable public URLs
- Public chain read experience — no account required to read or verify
- Suggestion queue — observers submit proposed blocks; owner approves via UI
- SaaS key custody path (platform manages keys; creator controls via OAuth identity)

**MVP 2 Success Gate:** A non-technical user creates and publishes a public chain without asking for help. At least one real public chain cited externally in the wild.

---

### Post-MVP Features

**Phase 3 (Growth):**
- Teams and org management (multi-signer chains)
- Paid tiers and billing
- API product (standalone, tiered)
- DB connector (`@glory-chain/db`)
- IPFS connector (`@glory-chain/ipfs`)
- Pluggable data structure modules (tree, graph, ledger utility modules)
- Community connector marketplace / registry
- `@glory-chain/tree` — membership hierarchy module

**Phase 4 (Expansion):**
- Governance framework: RFC process, ADR process (framework in repo from day one; formal process opens with community growth)
- Steering committee and open governance
- Glory Chain's own self-referential governance chain
- Advanced SaaS features: analytics, chain health dashboard, institutional white-label
- Cross-chain references and dependency graphs

---

### Risk Mitigation Strategy

**Technical Risks:**
- *Riskiest assumption:* Configurable crypto doesn't introduce incompatible verification paths across implementations. *Mitigation:* Publish a conformance test suite with the spec. Any implementation that passes the suite is interoperable.
- *Simplification lever:* Fork MVP 1 scope to `sha256` + `ed25519` only if configurable crypto adds too much surface area for initial spec validation. Re-open configurability in v1.1.

**Market Risks:**
- *Biggest risk:* Institutions don't adopt because no Demander pressure exists yet. *Mitigation:* Seed Demander adoption first — give journalists and watchdogs the tools to cite chains, then let that pressure build. The flywheel starts at the Demander end, not the institutional end.
- *Validation approach:* MVP 2 gate (external citation in the wild) is the market validation event. Don't scale before that gate passes.

**Resource Risks:**
- *Absolute minimum:* One developer can ship MVP 1 + MVP 2. The protocol is the hard part; the SaaS surface is deliberately thin.
- *Contingency:* If resources compress, deprioritize Suggestion Queue (MVP 2) — institutions can use GitHub Issues as a manual suggestion mechanism. Everything else in MVP 2 is critical path.

---

## Functional Requirements

> **Capability Contract:** UX designers, architects, and engineers will ONLY design and build what is listed here. Any capability not present in this list does not exist in the product unless explicitly added via a change request.
>
> **Discovery model (MVP):** Public chain discovery is link-first only. There is no browsable directory in MVP. A Demander discovers chains because someone hands them a URL — in an article, a tweet, a citation. This is intentional.

### Chain Lifecycle Management

- **FR1:** A chain creator can create a new chain anchored to a genesis block declaring the chain's purpose and identity
- **FR2:** A chain creator can append a cryptographically signed block to an existing chain they own
- **FR3:** Any user can verify the cryptographic integrity of any block in a chain
- **FR4:** Any user can verify the integrity of an entire chain from genesis to latest block
- **FR5:** A chain creator can fork a chain from any specified block, preserving the original chain's history as provenance
- **FR6:** A chain creator can migrate a chain from one connector to another, leaving a permanent migration record on the original
- **FR7:** A chain creator can generate a cryptographic keypair for chain signing, with a mandatory key custody warning
- **FR8:** The system prevents unauthorized users from appending blocks to a chain they do not own

### Block & Schema

- **FR9:** Every block contains a content payload, timestamp, previous block hash, chain ID, block number, and cryptographic signature
- **FR10:** The genesis block contains the chain's declared purpose, creator identity, and cryptographic configuration
- **FR11:** The hash algorithm and signature scheme are configurable per chain, with SHA-256 and Ed25519 as defaults
- **FR12:** Every block's signed payload includes the chain ID, preventing replay attacks across chains
- **FR13:** A chain creator can inspect the raw structure of any block in a chain
- **FR14:** A verifier can determine the protocol version of any chain and verify it against the appropriate spec version

### Persistence & Connectors

- **FR15:** A builder can persist a chain to the local file system using the file system connector
- **FR16:** A builder can persist a chain to a GitHub repository using the GitHub connector
- **FR17:** The GitHub connector can auto-generate a public read URL via GitHub Pages for any chain it hosts
- **FR18:** Any connector can emit watch events when the chain's persistence environment shows signs of compromise or tampering
- **FR19:** A chain creator can register additional connectors to replicate chain data across persistence layers
- **FR20:** A builder can implement a custom connector against the public connector interface contract
- **FR21:** A third-party implementation can verify conformance to the Glory Chain protocol specification

### Feed & Distribution

- **FR22:** Every chain exposes an RSS/Atom feed of its blocks
- **FR23:** A Demander can subscribe to a chain's RSS feed without creating an account
- **FR24:** A Demander can access a permanent, stable permalink for any individual block
- **FR25:** Any user can access a stable permalink for an entire chain
- **FR26:** The RSS feed updates within minutes of a new block being appended

### CLI

- **FR27:** A user can create a chain from the command line
- **FR28:** A user can append a block to a chain from the command line
- **FR29:** A user can verify a chain from the command line
- **FR30:** A user can fork a chain from the command line
- **FR31:** A user can migrate a chain between connectors from the command line
- **FR32:** A user can generate an RSS feed output for a chain from the command line
- **FR33:** A user can export a chain in a portable format from the command line

### Identity & Authentication (SaaS)

- **FR34:** A user can authenticate via OAuth using GitHub or Google identity
- **FR35:** The SaaS platform can manage chain signing keys on behalf of an authenticated user
- **FR36:** A chain creator can declare their public identity as an OAuth-verified account
- **FR37:** A chain creator can declare their public identity using an external system identifier
- **FR38:** A chain creator can create a chain anonymously
- **FR39:** A chain creator can transfer custodianship of a chain to another identity *(reserved for post-MVP)*

### SaaS Chain Management

- **FR40:** An authenticated user can create a chain via the web UI
- **FR41:** An authenticated user can append a block to their chain via the web UI
- **FR42:** An authenticated user can assign a human-readable named slug to their chain
- **FR43:** Any user can read and verify a public chain via its named URL without creating an account
- **FR44:** A chain creator can set a chain's visibility as public or private at creation time
- **FR45:** An observer can submit a proposed block to a public chain's suggestion queue
- **FR46:** A chain owner can review, approve, or reject suggested blocks from the suggestion queue

### Verification & Export

- **FR47:** Any user can independently verify a chain using only the public protocol specification, without any Glory Chain tooling
- **FR48:** A user can export a chain in a format suitable for archival and offline verification
- **FR49:** Any user can export a chain as a self-contained, offline-verifiable archive requiring no Glory Chain tooling
- **FR50:** The verification output identifies specific error conditions when a chain fails verification (broken chain, invalid signature, replay detected, unsupported algorithm, future timestamp, duplicate block)

### Fork & Resilience

- **FR51:** Any observer (including non-owners) can fork a public chain from any block they trust
- **FR52:** A forked chain carries a provenance reference to the block on the original chain from which it was forked
- **FR53:** The original chain maintains a record of known forks in its metadata
- **FR54:** Any user can query the complete fork history of a public chain
- **FR55:** Any user can determine whether a chain has ever been forked

### Developer Integration

- **FR56:** A builder can install `@glory-chain/core` from npm and create a verified chain without any service dependency
- **FR57:** A builder can install connector modules independently (`@glory-chain/fs`, `@glory-chain/github`) and compose them with the core library
- **FR58:** A builder can programmatically verify any chain using the library without network access

### External Chain Anchoring

- **FR59:** A chain creator can anchor a chain's genesis to a specific block on an external chain (e.g. Bitcoin, Ethereum) as an external provenance reference
- **FR60:** Any user can verify a chain's external anchor reference independently using the referenced chain's public explorer or API *(Phase 3 — anchor field reserved in schema from MVP 1; verification tooling ships in Phase 3)*

> **Schema note (MVP 1):** The genesis block schema reserves `externalAnchor?: { chainType: string, blockHash: string, blockHeight: number, networkId: string }`. The field is stored and surfaced by `glory-chain inspect` but not verified by the core library until Phase 3. Full anchor verification (`glory-chain verify --check-anchor`) is a Phase 3 capability.

---

## Non-Functional Requirements

### Performance

- **NFR1:** A block append operation completes and is reflected in the RSS feed within 60 seconds of submission
- **NFR2:** A chain permalink returns the correct block content within 2 seconds under normal load
- **NFR3:** The CLI `verify` command completes verification of a 1,000-block chain within 10 seconds on commodity hardware
- **NFR4:** `@glory-chain/core` adds less than 50KB to a production bundle (tree-shakeable; consumers only pay for what they import)

### Security

- **NFR5:** All cryptographic signing operations are performed client-side or in the user's custody path — the SaaS platform never transmits an unencrypted private key over the network
- **NFR6:** Chain signing keys managed by the SaaS platform are stored encrypted at rest and never logged
- **NFR7:** Block content is never modified post-append — the platform provides no edit or delete capability for published blocks
- **NFR8:** All SaaS API endpoints require authentication except public chain read and RSS feed endpoints
- **NFR9:** The `keygen` CLI command displays a mandatory key custody warning before outputting any key material
- **NFR10:** The platform logs no PII beyond what is required for OAuth authentication

### Reliability & Permanence

- **NFR11:** A block permalink must return identical content on any read, indefinitely — content-addressable by hash
- **NFR12:** A chain migrated between connectors must be fully verifiable from the new location with zero data loss
- **NFR13:** The SaaS platform targets 99.9% uptime for public chain read endpoints (read path is higher priority than write path)
- **NFR14:** The protocol library has zero runtime dependencies in production — no service calls, no network requirements for core verification

### Scalability

- **NFR15:** Public chain read endpoints are designed for CDN caching — responses are cache-friendly and cache-invalidation is block-append-triggered
- **NFR16:** The connector interface supports parallel replication to multiple persistence targets without blocking the append operation
- **NFR17:** The npm package works in Node.js ≥18, all modern browsers (ESM), and Deno without modification

### Interoperability & Openness

- **NFR18:** The protocol specification is sufficient for an independent developer to build a fully conformant implementation without access to the reference codebase
- **NFR19:** A conformance test suite is published alongside the spec — any implementation that passes is considered interoperable
- **NFR20:** The connector interface is versioned with backwards compatibility guarantees — a connector built against v1 continues to work when `@glory-chain/core` releases v2
- **NFR21:** RSS/Atom feeds comply with the Atom 1.0 specification and are parseable by any standard RSS reader

### Accessibility

- **NFR22:** The public chain read experience (SaaS) meets WCAG 2.1 AA — a Demander with a screen reader can read and navigate blocks without barriers
- **NFR23:** The SaaS chain creation flow (web UI) is completable by a non-technical user without documentation — success measured by MVP 2 gate

### Privacy & Compliance

- **NFR24:** Public chains are permanent by design — the platform makes no erasure guarantees for published blocks. This is documented clearly at chain creation time so creators understand the commitment before publishing
- **NFR25:** The SaaS platform can stop hosting a chain (removing it from its own infrastructure) without destroying the chain's existence on other persistence layers — hosting is not custody
- **NFR26:** Anonymous chain creation (FR38) produces no linkage between the chain and any authenticated identity in platform logs

### Product Communication

- **NFR27:** The product's onboarding, documentation, and public-facing UI explicitly communicate that cryptographic validity is not factual validity — the platform guarantees consistency, not truth. This distinction is visible to a user before they publish their first block.
