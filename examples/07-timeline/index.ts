/**
 * 07-timeline
 *
 * Project milestone and incident timeline.
 * Entries are tagged for filtering. Entries can be retracted without deletion —
 * the retraction itself is a block, so the history is always intact.
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendBlock, createChain, generateKeypair } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { Timeline } from "@glorychain/structures";

const { value: keypair } = generateKeypair()!;
const { publicKey, privateKey } = keypair;

const connector = new FsConnector(join(tmpdir(), "glorychain-examples"));

// ─── Create chain ─────────────────────────────────────────────────────────────

const createResult = createChain(
  {
    content: "Project Athena — milestone and incident timeline.",
    purpose: "timeline",
    creatorId: "pm@glorychain.io",
    identityType: "anonymous",
    publicKey,
    contentSchema: Timeline.genesisSchema,
  },
  privateKey,
);
if (!createResult.ok) throw new Error(createResult.error.message);

let chain = createResult.value;
console.log("Chain created:", chain.metadata.chainId);

// ─── Append timeline entries ──────────────────────────────────────────────────

const events = [
  Timeline.entry({
    id: "milestone-kickoff",
    title: "Project kickoff",
    body: "Initial planning complete. Team of 6 confirmed.",
    tags: ["milestone", "planning"],
    metadata: { owner: "finn@glorychain.io" },
  }),
  Timeline.entry({
    id: "milestone-alpha",
    title: "Alpha release",
    body: "Core chain primitives shipped. Ed25519 signing + SHA-256 hash-linking working end-to-end.",
    tags: ["milestone", "release"],
  }),
  Timeline.entry({
    id: "incident-001",
    title: "Production outage",
    body: "Payments API unavailable 14:30–15:45 UTC. Root cause: misconfigured rate limiter.",
    tags: ["incident", "production"],
    metadata: { severity: "P1", owner: "bob@glorychain.io" },
  }),
  Timeline.entry({
    id: "milestone-beta",
    title: "Beta release",
    body: "Structures module shipped. OrgTree, VoteRegister, KeyValueStore available.",
    tags: ["milestone", "release"],
  }),
  Timeline.entry({
    id: "incident-002",
    title: "Elevated error rate",
    body: "5xx rate spiked to 2.3% for 8 minutes. Caused by cold start on new deployment.",
    tags: ["incident", "production"],
    metadata: { severity: "P2" },
  }),
  // Retract duplicate entry
  Timeline.entry({
    id: "milestone-kickoff-dup",
    title: "Project kickoff (duplicate)",
    body: "Accidentally appended twice.",
    tags: ["milestone"],
  }),
  Timeline.retract({
    id: "milestone-kickoff-dup",
    reason: "Duplicate of milestone-kickoff",
  }),
];

for (const content of events) {
  const result = appendBlock(chain, { content, publicKey }, privateKey);
  if (!result.ok) throw new Error(result.error.message);
  chain = result.value;
}

await connector.write(chain);
console.log(`${events.length} timeline events appended.\n`);

// ─── Query current state ──────────────────────────────────────────────────────

const timeline = Timeline.fromChain(chain);

console.log("Active entries:");
for (const e of timeline.active) {
  console.log(`  [${e.id}] ${e.title} — tags: ${e.tags.join(", ")}`);
}

console.log("\nIncidents only:");
for (const e of timeline.byTag("incident")) {
  console.log(`  [${e.id}] ${e.title}`);
  console.log(`    ${e.body}`);
}

console.log("\nAll distinct tags:", timeline.tags);
console.log("Total entries:", timeline.count);
console.log("Retracted entries:", timeline.retracted.map((e) => e.id));
