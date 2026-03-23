import { describe, expect, it } from "vitest";
import { appendBlock, createChain } from "../chain/index.js";
import { generateKeypair } from "../crypto/keygen.js";
import { generateFeed } from "./generateFeed.js";

function makeChain(n = 2) {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  let chain = createChain(
    {
      content: "genesis content",
      purpose: "My Test Chain",
      creatorId: "alice",
      identityType: "anonymous",
      publicKey: kp.value.publicKey,
    },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  for (let i = 0; i < n - 1; i++) {
    const r = appendBlock(
      chain.value,
      { content: `block ${i + 1}`, publicKey: kp.value.publicKey },
      kp.value.privateKey,
    );
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
    expect(feed).toContain(`urn:glorychain:${chain.metadata.chainId}`);
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

  it("includes glorychain:hash for each entry", () => {
    const chain = makeChain(2);
    const feed = generateFeed(chain);
    expect(feed).toContain("glorychain:hash");
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

  it("escapes XML special chars in content and purpose", () => {
    const kp = generateKeypair();
    if (!kp.ok) throw new Error("keygen failed");
    const chain = createChain(
      {
        content: "a & b < c > d",
        purpose: "Test & Purpose",
        creatorId: "alice",
        identityType: "anonymous",
        publicKey: kp.value.publicKey,
      },
      kp.value.privateKey,
    );
    if (!chain.ok) throw new Error("createChain failed");
    const feed = generateFeed(chain.value);
    expect(feed).toContain("a &amp; b &lt; c &gt; d");
    expect(feed).toContain("Test &amp; Purpose");
  });
});
