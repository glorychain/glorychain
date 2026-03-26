/**
 * 06-decision-log
 *
 * Board resolution register.
 * Decisions can supersede earlier ones — the full lineage is preserved on-chain.
 * DecisionLog.fromChain() derives current status of every decision.
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendBlock, createChain, generateKeypair } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { DecisionLog } from "@glorychain/structures";

const { value: keypair } = generateKeypair()!;
const { publicKey, privateKey } = keypair;

const connector = new FsConnector(join(tmpdir(), "glorychain-examples"));

// ─── Create chain ─────────────────────────────────────────────────────────────

const createResult = createChain(
  {
    content: "GloryChain board resolution register.",
    purpose: "board-decisions",
    creatorId: "board.secretary@glorychain.io",
    identityType: "anonymous",
    publicKey,
    schema: DecisionLog.genesisSchema,
  },
  privateKey,
);
if (!createResult.ok) throw new Error(createResult.error.message);

let chain = createResult.value;
console.log("Chain created:", chain.metadata.chainId);

// ─── Append decisions ─────────────────────────────────────────────────────────

const events = [
  DecisionLog.record({
    id: "RES-2026-001",
    title: "Approve Q1 budget",
    body: "The board approves the Q1 2026 budget of $2.4M as presented.",
    decidedBy: "board",
    metadata: { vote: "5-0", reference: "BOD-2026-Q1" },
  }),
  DecisionLog.record({
    id: "RES-2026-002",
    title: "Appoint Finn Fitzsimons as CTO",
    body: "Finn Fitzsimons is appointed Chief Technology Officer, effective immediately.",
    decidedBy: "board",
    metadata: { vote: "5-0" },
  }),
  // Budget revised upward — record new decision, then mark old as superseded
  DecisionLog.record({
    id: "RES-2026-003",
    title: "Approve revised Q1 budget",
    body: "The board approves the revised Q1 2026 budget of $2.6M following updated projections.",
    decidedBy: "board",
    metadata: { vote: "4-1" },
  }),
  DecisionLog.supersede({
    id: "RES-2026-001",
    title: "Approve Q1 budget",
    body: "The board approves the Q1 2026 budget of $2.4M as presented.",
    decidedBy: "board",
    supersedes: "RES-2026-001",
    supersededBy: "RES-2026-003",
  }),
  // Annotate with implementation note
  DecisionLog.annotate({
    id: "RES-2026-003",
    note: "Finance team notified. Implementation begins 2026-02-01.",
  }),
];

for (const content of events) {
  const result = appendBlock(chain, { content, publicKey }, privateKey);
  if (!result.ok) throw new Error(result.error.message);
  chain = result.value;
}

await connector.write(chain);
console.log(`${events.length} decision events appended.\n`);

// ─── Query current state ──────────────────────────────────────────────────────

const log = DecisionLog.fromChain(chain);

console.log("All decisions:");
for (const d of log.all) {
  console.log(`  [${d.id}] ${d.title} — ${d.status}`);
  if (d.supersedes) console.log(`    supersedes: ${d.supersedes}`);
  if (d.annotations.length > 0) console.log(`    notes: ${d.annotations.join("; ")}`);
}

console.log("\nActive decisions:", log.active.map((d) => d.id));
console.log("Superseded decisions:", log.superseded.map((d) => d.id));
console.log("Withdrawn decisions:", log.withdrawn.map((d) => d.id));

console.log("\nLineage of RES-2026-001 (via supersededBy chain):");
for (const d of log.lineage("RES-2026-001")) {
  console.log(`  ${d.id} — ${d.title} (${d.status})`);
}
