/**
 * 10-changelog
 *
 * Software release register.
 * Every release, deprecation, and yank is a tamper-evident block.
 * ChangeLog.fromChain() derives the current state of all versions.
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendBlock, createChain, generateKeypair } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { ChangeLog } from "@glorychain/structures";

const { value: keypair } = generateKeypair()!;
const { publicKey, privateKey } = keypair;

const connector = new FsConnector(join(tmpdir(), "glorychain-examples"));

// ─── Create chain ─────────────────────────────────────────────────────────────

const createResult = createChain(
  {
    content: "@glorychain/core release register.",
    purpose: "changelog",
    creatorId: "ci-bot@glorychain.io",
    identityType: "anonymous",
    publicKey,
    contentSchema: ChangeLog.genesisSchema,
  },
  privateKey,
);
if (!createResult.ok) throw new Error(createResult.error.message);

let chain = createResult.value;
console.log("Chain created:", chain.metadata.chainId);

// ─── Append release events ────────────────────────────────────────────────────

const events = [
  ChangeLog.release({
    version: "0.1.0",
    notes: "Initial release. Chain creation, append, verify, Ed25519 signing.",
    tags: ["feature"],
    breaking: false,
    metadata: { sha: "abc1234", deployed_by: "finn@glorychain.io" },
  }),
  ChangeLog.release({
    version: "0.2.0",
    notes: "Add forkChain. Add inspectBlock. Improve VerificationResult error details.",
    tags: ["feature"],
    breaking: false,
    metadata: { sha: "def5678" },
  }),
  ChangeLog.release({
    version: "0.2.1",
    notes: "Fix: verifyChain returns correct blockCount when chain has no non-genesis blocks.",
    tags: ["bugfix"],
    breaking: false,
    metadata: { sha: "ghi9012" },
  }),
  // Breaking change — major version bump
  ChangeLog.release({
    version: "1.0.0",
    notes: "Stable API. Result<T,E> type replaces thrown errors throughout. generateKeypair now returns Result.",
    tags: ["feature", "breaking"],
    breaking: true,
    metadata: { sha: "jkl3456" },
  }),
  // Patch with a bug — yank it
  ChangeLog.release({
    version: "1.0.1",
    notes: "Performance: eliminate array copy in generateFeed.",
    tags: ["perf"],
    breaking: false,
    metadata: { sha: "mno7890" },
  }),
  ChangeLog.yank({
    version: "1.0.1",
    reason: "Regression: verifyChain fails on chains with >100 blocks. Use 1.0.2.",
  }),
  ChangeLog.release({
    version: "1.0.2",
    notes: "Fix regression in verifyChain introduced in 1.0.1. Performance improvement preserved.",
    tags: ["bugfix", "perf"],
    breaking: false,
    metadata: { sha: "pqr1234" },
  }),
  // Deprecate old minor
  ChangeLog.deprecate({
    version: "0.2.1",
    reason: "Pre-1.0. End of support. Upgrade to 1.0.2.",
  }),
];

for (const content of events) {
  const result = appendBlock(chain, { content, publicKey }, privateKey);
  if (!result.ok) throw new Error(result.error.message);
  chain = result.value;
}

await connector.write(chain);
console.log(`${events.length} release events appended.\n`);

// ─── Query current state ──────────────────────────────────────────────────────

const log = ChangeLog.fromChain(chain);

console.log("All releases:");
for (const r of log.all) {
  console.log(`  v${r.version} — ${r.status}${r.breaking ? " [BREAKING]" : ""}`);
  console.log(`    ${r.notes}`);
}

console.log("\nLatest active release:", log.latest?.version);
console.log("Active releases:", log.active.map((r) => r.version));
console.log("Yanked releases:", log.yanked.map((r) => r.version));
console.log("Deprecated releases:", log.deprecated.map((r) => r.version));
console.log("Breaking releases:", log.breaking.map((r) => r.version));
