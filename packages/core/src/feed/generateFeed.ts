import { PROTOCOL_VERSION } from "../chain/create.js";
import type { GenesisBlock } from "../schema/block.js";
import type { Chain } from "../schema/chain.js";

export interface FeedOptions {
  selfUrl?: string;
}

function escapeXml(s: string): string {
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
      ? `  <link rel="self" href="${escapeXml(options.selfUrl)}"/>\n`
      : "";

  const entries: string[] = [];
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]!;
    entries.push(`  <entry>
    <id>urn:glorychain:${metadata.chainId}:block:${block.blockNumber}</id>
    <title>Block ${block.blockNumber}</title>
    <updated>${block.timestamp}</updated>
    <content type="text">${escapeXml(block.content)}</content>
    <glorychain:hash xmlns:glorychain="https://glorychain.dev/ns">${block.hash}</glorychain:hash>
  </entry>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>urn:glorychain:${metadata.chainId}</id>
  <title>${escapeXml(genesis.purpose)}</title>
  <updated>${updated}</updated>
  <author><name>${escapeXml(genesis.creatorId)}</name></author>
${selfLink}  <generator>glorychain ${PROTOCOL_VERSION}</generator>
${entries.join("\n")}
</feed>`;
}
