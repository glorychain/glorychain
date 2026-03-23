# Story 2.6 — RSS/Atom Feed Generator

**Story ID:** 2.6
**Story Key:** `2-6-rss-atom-feed-generator`
**Epic:** 2 — Core Protocol Library
**Status:** done
**Created:** 2026-03-22

---

## Story

As a developer building on Glory Chain, I want a pure function `generateFeed(chain, options)` in `packages/core/src/feed/generateFeed.ts` that produces a valid Atom 1.0 XML feed from a chain's blocks, so that the CLI and SaaS route handler can serve chain content as an RSS-compatible feed without duplicating feed generation logic.

---

## Background and Context

**FR22** — chains expose an Atom 1.0 feed. Each block becomes a feed entry. The feed is pure — no I/O, no network, no side effects. The CLI (`glory-chain feed`, FR32) and the SaaS RSS endpoint (Story 8.3) both call this function.

Atom 1.0 (RFC 4287) is the target format. It is RSS-compatible via Atom-to-RSS converters. Key elements:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>urn:glory-chain:{chainId}</id>
  <title>{purpose}</title>
  <updated>{most recent block timestamp}</updated>
  <author><name>{creatorId}</name></author>
  <link rel="self" href="{selfUrl}" />
  <generator>glory-chain {protocolVersion}</generator>
  <entry>
    <id>urn:glory-chain:{chainId}:block:{blockNumber}</id>
    <title>Block {blockNumber}</title>
    <updated>{block.timestamp}</updated>
    <content type="text">{block.content}</content>
    <glory-chain:hash xmlns:glory-chain="https://glory-chain.dev/ns">{block.hash}</glory-chain:hash>
  </entry>
  ...
</feed>
```

No external XML library — build the string directly. The output is deterministic given the same inputs.

---

## Acceptance Criteria

### AC-1: File Structure
- `packages/core/src/feed/generateFeed.ts`
- `packages/core/src/feed/index.ts`
- `packages/core/src/feed/generateFeed.test.ts`

### AC-2: generateFeed function signature
```typescript
export interface FeedOptions {
  selfUrl?: string;  // URL of this feed (for <link rel="self">)
}
export function generateFeed(chain: Chain, options?: FeedOptions): string
```

### AC-3: Valid Atom 1.0 output
- Starts with `<?xml version="1.0" encoding="UTF-8"?>`
- Root element `<feed xmlns="http://www.w3.org/2005/Atom">`
- `<id>urn:glory-chain:{chainId}</id>`
- `<title>` from genesis block `purpose`
- `<updated>` from most recent block's timestamp
- `<author><name>{creatorId}</name></author>` from genesis block
- `<generator>glory-chain {PROTOCOL_VERSION}</generator>`
- One `<entry>` per block, ordered newest-first (descending blockNumber)
- Each entry: `<id>`, `<title>Block {n}</title>`, `<updated>`, `<content type="text">`
- Each entry includes `<glory-chain:hash>` extension element with block hash

### AC-4: XML escaping
- `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;` in all user-supplied content fields (content, purpose, creatorId)
- Hash values are hex — no escaping needed

### AC-5: selfUrl optional
- If `options.selfUrl` provided: include `<link rel="self" href="{selfUrl}"/>`
- If not provided: omit the link element

### AC-6: Tests pass, full pipeline green

---

## Tasks

### Task 1: Create packages/core/src/feed/generateFeed.ts
### Task 2: Create packages/core/src/feed/index.ts
### Task 3: Update packages/core/src/index.ts
### Task 4: Create packages/core/src/feed/generateFeed.test.ts
### Task 5: Run full pipeline

---

## Complete Implementation

### packages/core/src/feed/generateFeed.ts

```typescript
import type { GenesisBlock } from "../schema/block.js";
import type { Chain } from "../schema/chain.js";
import { PROTOCOL_VERSION } from "../chain/create.js";

export interface FeedOptions {
  selfUrl?: string;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateFeed(chain: Chain, options?: FeedOptions): string {
  const { metadata, blocks } = chain;
  const genesis = blocks[0] as GenesisBlock;

  const mostRecent = blocks[blocks.length - 1];
  const updated = mostRecent?.timestamp ?? genesis.timestamp;

  const selfLink =
    options?.selfUrl !== undefined
      ? `  <link rel="self" href="${escape(options.selfUrl)}"/>\n`
      : "";

  const entries = [...blocks]
    .reverse()
    .map((block) => {
      return `  <entry>
    <id>urn:glory-chain:${metadata.chainId}:block:${block.blockNumber}</id>
    <title>Block ${block.blockNumber}</title>
    <updated>${block.timestamp}</updated>
    <content type="text">${escape(block.content)}</content>
    <glory-chain:hash xmlns:glory-chain="https://glory-chain.dev/ns">${block.hash}</glory-chain:hash>
  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>urn:glory-chain:${metadata.chainId}</id>
  <title>${escape(genesis.purpose)}</title>
  <updated>${updated}</updated>
  <author><name>${escape(genesis.creatorId)}</name></author>
${selfLink}  <generator>glory-chain ${PROTOCOL_VERSION}</generator>
${entries}
</feed>`;
}
```

### packages/core/src/feed/index.ts

```typescript
export type { FeedOptions } from "./generateFeed.js";
export { generateFeed } from "./generateFeed.js";
```

### packages/core/src/feed/generateFeed.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { appendBlock, createChain } from "../chain/index.js";
import { generateKeypair } from "../crypto/keygen.js";
import { generateFeed } from "./generateFeed.js";

function makeChain(n = 2) {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  let chain = createChain(
    { content: "genesis content", purpose: "My Test Chain", creatorId: "alice", identityType: "anonymous", publicKey: kp.value.publicKey },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  for (let i = 0; i < n - 1; i++) {
    const r = appendBlock(chain.value, { content: `block ${i + 1}`, publicKey: kp.value.publicKey }, kp.value.privateKey);
    if (!r.ok) throw new Error("appendBlock failed");
    chain = r;
  }
  return chain.value;
}

describe("generateFeed", () => {
  it("returns a string starting with XML declaration", () => {
    const chain = makeChain();
    const feed = generateFeed(chain);
    expect(feed).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it("contains Atom feed root element", () => {
    const chain = makeChain();
    const feed = generateFeed(chain);
    expect(feed).toContain('xmlns="http://www.w3.org/2005/Atom"');
  });

  it("feed id contains chainId", () => {
    const chain = makeChain();
    const feed = generateFeed(chain);
    expect(feed).toContain(`urn:glory-chain:${chain.metadata.chainId}`);
  });

  it("title contains chain purpose", () => {
    const chain = makeChain();
    const feed = generateFeed(chain);
    expect(feed).toContain("<title>My Test Chain</title>");
  });

  it("author contains creatorId", () => {
    const chain = makeChain();
    const feed = generateFeed(chain);
    expect(feed).toContain("<name>alice</name>");
  });

  it("contains one entry per block", () => {
    const chain = makeChain(3);
    const feed = generateFeed(chain);
    const entryCount = (feed.match(/<entry>/g) ?? []).length;
    expect(entryCount).toBe(3);
  });

  it("entries are ordered newest-first", () => {
    const chain = makeChain(3);
    const feed = generateFeed(chain);
    const block2pos = feed.indexOf("Block 2");
    const block0pos = feed.indexOf("Block 0");
    expect(block2pos).toBeLessThan(block0pos);
  });

  it("includes glory-chain:hash for each entry", () => {
    const chain = makeChain(2);
    const feed = generateFeed(chain);
    expect(feed).toContain("glory-chain:hash");
    expect(feed).toContain(chain.blocks[0]?.hash ?? "");
  });

  it("includes selfUrl link when provided", () => {
    const chain = makeChain();
    const feed = generateFeed(chain, { selfUrl: "https://example.com/feed" });
    expect(feed).toContain('rel="self"');
    expect(feed).toContain("https://example.com/feed");
  });

  it("omits link element when selfUrl not provided", () => {
    const chain = makeChain();
    const feed = generateFeed(chain);
    expect(feed).not.toContain('rel="self"');
  });

  it("escapes XML special chars in content", () => {
    const kp = generateKeypair();
    if (!kp.ok) throw new Error("keygen failed");
    const chain = createChain(
      { content: "a & b < c > d", purpose: "Test & Purpose", creatorId: "alice", identityType: "anonymous", publicKey: kp.value.publicKey },
      kp.value.privateKey,
    );
    if (!chain.ok) throw new Error("createChain failed");
    const feed = generateFeed(chain.value);
    expect(feed).toContain("a &amp; b &lt; c &gt; d");
    expect(feed).toContain("Test &amp; Purpose");
  });
});
```

---

## Traceability

| AC | Requirement |
|----|-------------|
| Atom 1.0 format | FR22 |
| Pure function, no I/O | Architecture — CLI + SaaS both call this |
| Block hash in extension element | FR22 — chain integrity surfaced in feed |
| XML escaping | Security — prevent malformed XML from user content |

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List

### File List
- `packages/core/src/feed/generateFeed.ts`
- `packages/core/src/feed/index.ts`
- `packages/core/src/feed/generateFeed.test.ts`
- `packages/core/src/index.ts` (updated)
