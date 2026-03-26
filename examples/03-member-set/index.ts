/**
 * 03-member-set
 *
 * Platform team membership register.
 * Tracks joins, departures, and role changes — full history on-chain,
 * current state derived via MemberSet.fromChain().
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendBlock, createChain, generateKeypair } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { MemberSet } from "@glorychain/structures";

const { value: keypair } = generateKeypair()!;
const { publicKey, privateKey } = keypair;

const connector = new FsConnector(join(tmpdir(), "glorychain-examples"));

// ─── Create chain ─────────────────────────────────────────────────────────────

const createResult = createChain(
  {
    content: "Platform Team Roster — authoritative membership registry.",
    purpose: "membership",
    creatorId: "finn@glorychain.io",
    identityType: "anonymous",
    publicKey,
    schema: MemberSet.genesisSchema,
  },
  privateKey,
);
if (!createResult.ok) throw new Error(createResult.error.message);

let chain = createResult.value;
console.log("Chain created:", chain.metadata.chainId);

// ─── Append membership events ─────────────────────────────────────────────────

const events = [
  MemberSet.join({ id: "finn@glorychain.io", name: "Finn Fitzsimons", role: "Founder & Tech Lead" }),
  MemberSet.join({ id: "alice@glorychain.io", name: "Alice Chen", role: "Senior Engineer" }),
  MemberSet.join({ id: "bob@glorychain.io", name: "Bob Okafor", role: "Engineer" }),
  MemberSet.roleChange({ id: "bob@glorychain.io", role: "Senior Engineer" }),
  MemberSet.join({ id: "sara@glorychain.io", name: "Sara Lindqvist", role: "Engineer" }),
  MemberSet.leave({ id: "alice@glorychain.io", reason: "Moved to new role at Stripe" }),
  MemberSet.join({ id: "marcos@glorychain.io", name: "Marcos Souza", role: "Engineer" }),
];

for (const content of events) {
  const result = appendBlock(chain, { content, publicKey }, privateKey);
  if (!result.ok) throw new Error(result.error.message);
  chain = result.value;
}

await connector.write(chain);
console.log(`${events.length} membership events appended.\n`);

// ─── Query current state ──────────────────────────────────────────────────────

const set = MemberSet.fromChain(chain);

console.log("Current members (active, not suspended):");
for (const m of set.current) {
  console.log(`  ${m.name} <${m.id}> — ${m.role}`);
}

console.log("\nAll members including departed:");
for (const m of set.all) {
  const status = !m.active ? " (departed)" : m.suspended ? " (suspended)" : "";
  console.log(`  ${m.name}${status}`);
}

console.log("\nHeadcount (active):", set.headcount);

// ─── Look up a specific member ────────────────────────────────────────────────

const alice = set.get("alice@glorychain.io");
if (alice) {
  console.log("\nalice@glorychain.io:");
  console.log("  active:       ", alice.active);
  console.log("  role:         ", alice.role);
  console.log("  joinedAtBlock:", alice.joinedAtBlock);
}
