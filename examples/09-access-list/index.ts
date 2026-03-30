/**
 * 09-access-list
 *
 * Production API access register.
 * Every grant, revocation, and expiry is a signed block —
 * tamper-evident audit trail of who had access to what, and when.
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendBlock, createAjvValidator, createChain, generateKeypair } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { AccessList } from "@glorychain/structures";

const { value: keypair } = generateKeypair()!;
const { publicKey, privateKey } = keypair;
const validator = createAjvValidator();

const connector = new FsConnector(join(tmpdir(), "glorychain-examples"));

// ─── Create chain ─────────────────────────────────────────────────────────────

const createResult = createChain(
  {
    content: "Production API access register.",
    purpose: "access-control",
    creatorId: "platform-team@glorychain.io",
    identityType: "anonymous",
    publicKey,
    contentSchema: AccessList.genesisSchema,
  },
  privateKey,
);
if (!createResult.ok) throw new Error(createResult.error.message);

let chain = createResult.value;
console.log("Chain created:", chain.metadata.chainId);

// ─── Append access events ─────────────────────────────────────────────────────

const events = [
  // Grant contractors time-limited access
  AccessList.grant({
    id: "contractor-alice",
    label: "payments-api (read-only)",
    grantedBy: "platform-lead@glorychain.io",
    expiresAt: "2026-06-30T00:00:00Z",
    metadata: { ticket: "SEC-1042" },
  }),
  AccessList.grant({
    id: "contractor-bob",
    label: "payments-api (read-write)",
    grantedBy: "platform-lead@glorychain.io",
    expiresAt: "2026-03-31T00:00:00Z",
    metadata: { ticket: "SEC-1043" },
  }),
  // Grant permanent internal access
  AccessList.grant({
    id: "ci-deploy-bot",
    label: "deployment-api",
    grantedBy: "platform-lead@glorychain.io",
  }),
  // Bob's contract ended early — revoke
  AccessList.revoke({
    id: "contractor-bob",
    revokedBy: "platform-lead@glorychain.io",
    reason: "Contract ended early",
  }),
  // Alice's access expired — mark it
  AccessList.expire({
    id: "contractor-alice",
  }),
];

for (const content of events) {
  const result = appendBlock(chain, { content, publicKey }, privateKey, { validateContent: validator });
  if (!result.ok) throw new Error(result.error.message);
  chain = result.value;
}

await connector.write(chain);
console.log(`${events.length} access events appended.\n`);

// ─── Query current state ──────────────────────────────────────────────────────

const list = AccessList.fromChain(chain);

console.log("All access entries:");
for (const e of list.all) {
  const status = e.granted ? "granted" : "revoked/expired";
  console.log(`  [${e.id}] ${e.label ?? "(no label)"} — ${status}`);
  if (e.expiresAt) console.log(`    expires: ${e.expiresAt}`);
}

console.log("\nCurrently granted:", list.granted.map((e) => e.id));
console.log("Revoked/expired:", list.revoked.map((e) => e.id));

console.log("\nIs contractor-alice granted?", list.isGranted("contractor-alice"));
console.log("Is ci-deploy-bot granted?   ", list.isGranted("ci-deploy-bot"));
console.log("Is contractor-bob granted?  ", list.isGranted("contractor-bob"));

// Stale as of a future date — who would need renewal?
const stale = list.stale(new Date("2026-07-01T00:00:00Z"));
console.log("\nStale (not yet expired but would be by 2026-07-01):", stale.map((e) => e.id));
