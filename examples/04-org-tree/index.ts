/**
 * 04-org-tree
 *
 * Engineering org structure — verifiable reporting hierarchy.
 * Appointments, promotions, and transfers are all on-chain events.
 * OrgTree.fromChain() derives the current org chart by replaying them.
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendBlock, createChain, generateKeypair } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { OrgTree } from "@glorychain/structures";

const { value: keypair } = generateKeypair()!;
const { publicKey, privateKey } = keypair;

const connector = new FsConnector(join(tmpdir(), "glorychain-examples"));

// ─── Create chain ─────────────────────────────────────────────────────────────

const createResult = createChain(
  {
    content: "Engineering Org Structure — verifiable record of the GloryChain engineering reporting structure.",
    purpose: "org-chart",
    creatorId: "finn@glorychain.io",
    identityType: "anonymous",
    publicKey,
    contentSchema: OrgTree.genesisSchema,
  },
  privateKey,
);
if (!createResult.ok) throw new Error(createResult.error.message);

let chain = createResult.value;
console.log("Chain created:", chain.metadata.chainId);

// ─── Append org events ────────────────────────────────────────────────────────

const events = [
  OrgTree.appoint({ id: "finn@glorychain.io", name: "Finn Fitzsimons", role: "CTO", reportsTo: null }),
  OrgTree.appoint({ id: "alice@glorychain.io", name: "Alice Chen", role: "Engineering Manager", reportsTo: "finn@glorychain.io" }),
  OrgTree.appoint({ id: "bob@glorychain.io", name: "Bob Okafor", role: "Senior Engineer", reportsTo: "alice@glorychain.io" }),
  OrgTree.appoint({ id: "sara@glorychain.io", name: "Sara Lindqvist", role: "Engineer", reportsTo: "alice@glorychain.io" }),
  OrgTree.appoint({ id: "marcos@glorychain.io", name: "Marcos Souza", role: "Engineer", reportsTo: "alice@glorychain.io" }),
  // Bob gets promoted — now reports directly to Finn
  OrgTree.promote({ id: "bob@glorychain.io", role: "Staff Engineer", reportsTo: "finn@glorychain.io" }),
  OrgTree.appoint({ id: "yuki@glorychain.io", name: "Yuki Tanaka", role: "Engineer", reportsTo: "alice@glorychain.io" }),
];

for (const content of events) {
  const result = appendBlock(chain, { content, publicKey }, privateKey);
  if (!result.ok) throw new Error(result.error.message);
  chain = result.value;
}

await connector.write(chain);
console.log(`${events.length} org events appended.\n`);

// ─── Query current state ──────────────────────────────────────────────────────

const tree = OrgTree.fromChain(chain);

console.log("Org roots:");
for (const m of tree.roots) {
  console.log(`  ${m.name} — ${m.role}`);
}

console.log("\nDirect reports of finn@glorychain.io:");
for (const m of tree.directReports("finn@glorychain.io")) {
  console.log(`  ${m.name} — ${m.role}`);
}

console.log("\nDirect reports of alice@glorychain.io:");
for (const m of tree.directReports("alice@glorychain.io")) {
  console.log(`  ${m.name} — ${m.role}`);
}

console.log("\nFull subtree under finn@glorychain.io:");
for (const m of tree.subtree("finn@glorychain.io")) {
  console.log(`  ${m.name} — ${m.role}`);
}

console.log("\nPath to yuki@glorychain.io:");
const path = tree.pathTo("yuki@glorychain.io");
console.log(" ", path.map((m) => m.name).join(" → "));

console.log("\nHeadcount:", tree.headcount);
console.log("Depth 0 (roots):", tree.atDepth(0).map((m) => m.name));
console.log("Depth 1:", tree.atDepth(1).map((m) => m.name));
console.log("Depth 2:", tree.atDepth(2).map((m) => m.name));
