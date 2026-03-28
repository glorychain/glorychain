/**
 * 05-vote-register
 *
 * Protocol governance vote register.
 * Motions move through their full lifecycle: open → votes cast → closed.
 * VoteRegister.fromChain() derives the current state of all motions.
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendBlock, createChain, generateKeypair } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { VoteRegister } from "@glorychain/structures";

const { value: keypair } = generateKeypair()!;
const { publicKey, privateKey } = keypair;

const connector = new FsConnector(join(tmpdir(), "glorychain-examples"));

// ─── Create chain ─────────────────────────────────────────────────────────────

const createResult = createChain(
  {
    content: "Protocol Governance Vote Register.",
    purpose: "governance",
    creatorId: "governance@glorychain.io",
    identityType: "anonymous",
    publicKey,
    contentSchema: VoteRegister.genesisSchema,
  },
  privateKey,
);
if (!createResult.ok) throw new Error(createResult.error.message);

let chain = createResult.value;
console.log("Chain created:", chain.metadata.chainId);

// ─── Motion 1: passed ─────────────────────────────────────────────────────────

const events = [
  VoteRegister.motion({ id: "motion-001", title: "Adopt protocol v0.2", proposedBy: "finn@glorychain.io", metadata: { quorum: "3" } }),
  VoteRegister.cast({ motionId: "motion-001", voterId: "finn@glorychain.io", vote: "yes" }),
  VoteRegister.cast({ motionId: "motion-001", voterId: "alice@glorychain.io", vote: "yes" }),
  VoteRegister.cast({ motionId: "motion-001", voterId: "bob@glorychain.io", vote: "abstain" }),
  VoteRegister.close({ motionId: "motion-001", outcome: "passed" }),

  // Motion 2: failed
  VoteRegister.motion({ id: "motion-002", title: "Increase block size limit to 64kb", proposedBy: "bob@glorychain.io" }),
  VoteRegister.cast({ motionId: "motion-002", voterId: "finn@glorychain.io", vote: "no" }),
  VoteRegister.cast({ motionId: "motion-002", voterId: "alice@glorychain.io", vote: "no" }),
  VoteRegister.cast({ motionId: "motion-002", voterId: "bob@glorychain.io", vote: "yes" }),
  VoteRegister.close({ motionId: "motion-002", outcome: "failed" }),

  // Motion 3: open (still in progress)
  VoteRegister.motion({ id: "motion-003", title: "Add S3 connector to official spec", proposedBy: "sara@glorychain.io" }),
  VoteRegister.cast({ motionId: "motion-003", voterId: "finn@glorychain.io", vote: "yes" }),

  // Motion 4: withdrawn
  VoteRegister.motion({ id: "motion-004", title: "Deprecated — superseded", proposedBy: "finn@glorychain.io" }),
  VoteRegister.withdraw({ motionId: "motion-004", reason: "Superseded by motion-003" }),
];

for (const content of events) {
  const result = appendBlock(chain, { content, publicKey }, privateKey);
  if (!result.ok) throw new Error(result.error.message);
  chain = result.value;
}

await connector.write(chain);
console.log(`${events.length} vote events appended.\n`);

// ─── Query current state ──────────────────────────────────────────────────────

const register = VoteRegister.fromChain(chain);

console.log("All motions:");
for (const m of register.all) {
  const tally = register.tally(m.id);
  console.log(`  [${m.id}] ${m.title}`);
  console.log(`    status: ${m.status}${m.outcome ? ` (${m.outcome})` : ""}`);
  console.log(`    tally:  yes=${tally.yes} no=${tally.no} abstain=${tally.abstain}`);
}

console.log("\nOpen motions:", register.open.map((m) => m.id));
console.log("Passed motions:", register.passed.map((m) => m.id));
console.log("Failed motions:", register.failed.map((m) => m.id));
console.log("Withdrawn motions:", register.withdrawn.map((m) => m.id));

console.log("\nVoters on motion-001:", register.voters("motion-001"));
