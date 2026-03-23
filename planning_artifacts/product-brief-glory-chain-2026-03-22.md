---
stepsCompleted: [1, 2, 3, 4, 5, 6]
workflowComplete: true
inputDocuments: ['planning_artifacts/brainstorming/brainstorming-session-2026-03-22.md']
date: 2026-03-22
author: Finn
---

# Product Brief: Glory Chain

## Executive Summary

Glory Chain gives communities a way to demand verifiable transparency from the institutions they trust — and gives those institutions a way to prove they deserve it.

It is a lightweight, open-source blockchain protocol for creating censorship-resistant, tamper-evident records of intent. Any individual, organisation, or community can create a chain anchored to a genesis of purpose, append cryptographically signed blocks, and publish that chain to any persistence layer. A SaaS platform wraps this with identity, convenience, and API access. An ecosystem of connectors, CLI tools, and utility modules makes it composable for developers.

The platform is a notary, not a judge. It guarantees integrity, not truth. Judgment belongs to the reader.

---

## Core Vision

### Problem Statement

Information can be falsified, suppressed, or quietly edited by those who control it. There is no lightweight, open, censorship-resistant way for individuals, organisations, or communities to maintain a verifiable record of truth that anyone can read, nobody can secretly alter, and that survives attempts to destroy it.

### Problem Impact

Communities that depend on institutions — political organisations, NGOs, governments, open source projects, media — have no reliable way to hold those institutions to their stated positions, decisions, or commitments. Records get edited. Statements get walked back. Accountability evaporates.

### Why Existing Solutions Fall Short

- **Traditional blockchains** (Bitcoin, Ethereum) are overkill — expensive, complex, designed for financial transactions not record-keeping
- **Git/GitHub** gives versioning but not tamper-evidence as a social convention or identity guarantees
- **Centralised platforms** (Notion, Google Docs) can be edited silently and are subject to censorship or takedown
- **Legal notarisation** is expensive, slow, and not programmatically accessible

### Proposed Solution

A lightweight blockchain protocol — open source, modular, self-hostable — where any entity can create a chain anchored to a genesis of intent, append cryptographically signed blocks, and publish that chain to any persistence layer. A SaaS platform wraps this with identity, convenience, and API access.

The cultural driver is consumer expectation. Institutions adopt Glory Chain not because they are forced to, but because their communities demand it — and because adoption signals goodwill. Absence signals something else.

### Key Differentiators

- **Neutral by design** — the platform never judges content, only guarantees integrity. Infrastructure, not endorsement.
- **Consumer-driven adoption** — the pressure to create chains comes from audiences, not the platform
- **Persistence-agnostic** — chains live wherever they were born; connectors handle transport
- **Fork model** — compromise creates visible lineage, not destruction
- **RSS-native** — consumption requires zero new tooling; the open web archives public chains passively
- **Open core** — the protocol is unstoppable even if the SaaS disappears

---

## Target Users

### Go-To-Market Flywheel

The three user types are not equal — they form a sequenced flywheel:

1. **Demanders** are acquired first — they create social pressure on institutions
2. **Demonstrators** adopt in response to that pressure — creating public chains
3. **Builders** integrate Glory Chain into products because chains now exist and consumers expect them

Don't sell to institutions. Build tools for the people who hold institutions accountable. The institutions follow.

---

### Primary Users

**Persona 1: The Demander** — *"Show me the receipts."*

**Profile:** Layla, 34, investigative journalist and civic activist. Follows political organisations, NGOs, and public institutions closely. Sceptical of press releases — she's been burned by organisations that quietly reversed positions or scrubbed inconvenient history.

**Problem experience:** She screenshots statements, archives web pages manually, maintains her own records. It's fragile, labour-intensive, and hard to share as evidence.

**What she wants:** A permanent, verifiable citation she can embed in published work. To say "their chain shows they said X on date Y" — or "they have no chain, draw your own conclusions."

**Journey:**
- *Discovery:* A chain permalink appears in a colleague's article or a tweet demanding institutional transparency
- *Onboarding:* Zero friction — opens the chain URL, reads blocks, subscribes via RSS. No account needed.
- *Core usage:* Follows chains via RSS, cites block permalinks in published work, notices when chains go silent
- *Aha moment:* A chain went silent for 6 months immediately after a controversial decision — that silence tells its own story

---

**Persona 2a: The Willing Demonstrator** — *"We want to be held accountable."*

**Profile:** Marcus, 47, Director of Operations at a mid-sized environmental NGO. His organisation has faced accusations of financial opacity and mission drift. The board has decided to proactively publish governance decisions, funding sources, and project outcomes publicly.

**Problem experience:** Annual reports are slow, curated, and trusted by nobody. They want something continuous, verifiable, and impossible to quietly edit after publication.

**Journey:**
- *Discovery:* Peer organisation mentions it at a conference, or a donor asks if they have one
- *Onboarding:* SaaS OAuth signup, creates genesis block describing the organisation's founding purpose
- *Core usage:* Appends blocks after board meetings, funding decisions, project milestones
- *Aha moment:* A major donor renews their grant specifically citing the organisation's Glory Chain as evidence of trustworthiness

---

**Persona 2b: The Reluctant Demonstrator** — *"Fine. We'll do it."*

**Profile:** Diane, 52, Communications Director at a city council. Her department is under pressure from a civic transparency campaign demanding the council maintain a public chain of planning decisions. She wasn't looking for this — she was told to implement it.

**Problem experience:** She doesn't understand the technology and doesn't have time to learn it. Her team needs the onboarding to be painless. She needs it to look credible without being a burden.

**What she wants:** The minimum viable chain that satisfies public expectation. Something she can point to when asked.

**Journey:**
- *Discovery:* External pressure — community organisations, journalists, or activists publicly demanding a chain
- *Onboarding:* Needs white-glove simplicity — OAuth, a template genesis, a clear "you're done" moment
- *Core usage:* Delegates block appending to a team member; mostly passive
- *Aha moment:* The public pressure campaign names her council as a compliant institution — the chain did its job

---

**Persona 3: The Builder** — *"I need verifiable records in my product."*

**Profile:** Sofia, 28, full-stack developer building a community governance platform for neighbourhood associations. Needs a tamper-evident audit trail for votes, decisions, and membership changes — but doesn't want to build blockchain infrastructure from scratch.

**Problem experience:** Evaluated Ethereum (too expensive), custom signing solutions (too fragile), database logs (not verifiable enough).

**What she wants:** A clean npm package, well-documented connector interface, and CLI for local development. She'll handle the UI herself.

**Journey:**
- *Discovery:* Finds `@glory-chain/core` on npm or a GitHub repo
- *Onboarding:* `npm install @glory-chain/core @glory-chain/fs`, working chain in under an hour
- *Core usage:* Builds platform on top of library; uses GitHub connector for persistence; uses tree module for membership hierarchy
- *Aha moment:* A user asks "can I verify this vote independently?" — and the answer is yes, without calling her API

---

### Secondary Users

**The Forker** — A technically capable community member who forks a compromised chain from a trusted block, creating a new chain with the original history as provenance. Rare but critical to ecosystem resilience. Their journey must be explicitly designed — the fork workflow is complex and needed most in moments of crisis.

**The Auditor** — A compliance officer, election monitor, or institutional watchdog who consumes chains as part of a formal audit process. Needs export, permalink, and verification capabilities.

---

### User Journey Summary

| Stage | Demander | Willing Demonstrator | Reluctant Demonstrator | Builder |
|-------|----------|---------------------|----------------------|---------|
| Discovery | Sees chain cited publicly | Peer recommendation | External social pressure | npm / GitHub search |
| Onboarding | No signup — open URL | SaaS OAuth, create genesis | Needs maximum simplicity | npm install, quickstart |
| Core usage | RSS follow, cite permalinks | Append blocks after decisions | Delegate, mostly passive | Build product on library |
| Aha moment | Chain silence tells a story | Donor cites chain as trust signal | Named as compliant institution | Users can self-verify |
| Long-term | Expects chains from all institutions | Chain becomes org identity | Chain becomes compliance habit | Ships multiple products on Glory Chain |

---

## Success Metrics

### User Success

| User | Success Signal |
|------|---------------|
| Demander | Chain permalink returns identical content 1 year later. RSS delivers new blocks within minutes of appending. |
| Willing Demonstrator | First block appended within 15 minutes of signup. Regular appending cadence maintained. |
| Reluctant Demonstrator | Chain created and publicly visible with minimal friction. Onboarding completable without technical knowledge. |
| Builder | Zero-to-first-chain under 1 hour. Zero-to-first-verified-chain (independently verified using public spec) under 1 day. Library works across target runtimes without surprises. |

---

### Business Objectives

**3 Months**
- Protocol spec published AND independently verified by at least one external developer building against it
- Connector interface standard validated by a community-built connector
- Core library available on npm with file + GitHub connectors
- First 100 public chains created
- SaaS early access live

**12 Months**
- 1,000+ active public chains with healthy append frequency
- At least one credible institution (NGO, journalist org, gov body) publicly citing their Glory Chain
- Paid SaaS tier live with first paying customers
- At least one community-built connector in the registry
- At least one successful public fork event — resilience model proved in practice

---

### Key Performance Indicators

**Primary Health Metric**
- **Chain append frequency** — % of chains with at least one block appended in the last 30 days *(north star — creation volume is vanity, activity is health)*

**Growth**
- Chains created per week
- New accounts per week (SaaS)
- npm connector installs per month

**Consumer Engagement (Demander Flywheel)**
- Public chain read requests per week
- RSS subscriber count across all public chains
- **Chain citation rate** — external referrers to chain permalinks *(leading indicator of flywheel activation — tracked via referrer analytics from day one)*

**Developer Adoption**
- npm downloads of `@glory-chain/core`
- Time to first verified chain (DX benchmark)
- Community connector count

**Ecosystem Health**
- % of chains that have never migrated *(stability signal — higher is better)*
- Fork events per quarter *(resilience signal — target at least 1 in year one to prove the model works)*
- % of chains with active RSS subscribers *(consumer engagement depth)*

---

## MVP Scope

### Two Sequential MVPs

**MVP 1 — Protocol** *(ships first)*
**MVP 2 — SaaS** *(ships immediately after — committed, not deferred)*

The flywheel activates in MVP 2. MVP 1 validates the protocol. Both are required for the full value proposition.

---

### MVP 1: Protocol Core Features

- **Chain engine** — create, append, verify, sign with keypair, fork from block
- **Genesis + block schema** — well-defined, documented, stable, independently verifiable
- **File system connector** — chains live on disk
- **GitHub connector** — chains live in repos, with GitHub Pages auto-generation for public read URLs *(zero infrastructure consumer experience — Demanders get a readable URL without a web app)*
- **Connector threat detection** — watch + migrate events
- **CLI** — `glory-chain create`, `glory-chain append`, `glory-chain verify`, `glory-chain fork`
- **`@glory-chain/core` npm package** — publicly installable, modular
- **RSS feed output** — every chain exposes an RSS/Atom feed, readable by anyone with an RSS reader

### MVP 2: Minimal SaaS Features

- OAuth login (GitHub, Google)
- Create a chain via web UI
- Append a block via web UI
- Named chain slugs — human-readable public URLs
- Public chain read experience — anyone opens a URL, reads and verifies blocks, no account needed
- Suggestion queue — observers submit proposed blocks, owner approves via UI

---

### Out of Scope for Both MVPs

- Teams and org management
- Paid tiers and billing
- API product
- Pluggable data structure modules (tree, graph, ledger)
- DB connector, IPFS connector
- Community connector marketplace
- Governance framework and RFC process *(framework exists in repo; formal process comes with community growth)*

---

### MVP Success Gates

**MVP 1 Gate:** An external developer builds a working, publicly verifiable chain using only the public spec and npm package — without asking for help.

**MVP 2 Gate:** A non-technical user creates and publishes a public chain without asking for help. At least one real public chain cited externally in the wild.

Both gates must pass before scaling begins.

---

### Future Vision — 2 Years

The full 5-layer ecosystem: mature SaaS with teams and billing, standalone API product, connector marketplace, pluggable data structure modules, community governance chain, steering committee. Glory Chain becomes the default transparency infrastructure for civil society organisations, open source projects, and accountability-driven institutions globally.

The protocol remains open, forkable, and independent of the commercial entity — permanently.
