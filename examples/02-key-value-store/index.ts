/**
 * 02-key-value-store
 *
 * Production service config audit log.
 * Every SET and DELETE is a tamper-evident block — full history preserved,
 * current state derived on demand via KeyValueStore.fromChain().
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendBlock, createChain, generateKeypair } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { KeyValueStore } from "@glorychain/structures";

const { value: keypair } = generateKeypair()!;
const { publicKey, privateKey } = keypair;

const connector = new FsConnector(join(tmpdir(), "glorychain-examples"));

// ─── Create chain ─────────────────────────────────────────────────────────────

const createResult = createChain(
  {
    content:
      "Production Service Config — tamper-evident audit log of all configuration changes.",
    purpose: "config",
    creatorId: "deploy-bot@glorychain.io",
    identityType: "anonymous",
    publicKey,
    contentSchema: KeyValueStore.genesisSchema,
  },
  privateKey,
);
if (!createResult.ok) throw new Error(createResult.error.message);

let chain = createResult.value;
const chainId = chain.metadata.chainId;
console.log("Chain created:", chainId);

// ─── Append config events ─────────────────────────────────────────────────────

const events = [
  KeyValueStore.set({ key: "payments.max_retry_count", value: "5" }),
  KeyValueStore.set({ key: "api.rate_limit.requests_per_minute", value: "1000" }),
  KeyValueStore.set({ key: "feature_flags.new_onboarding", value: "true" }),
  // Tuning: reduce retries and rate limit after incident
  KeyValueStore.set({ key: "payments.max_retry_count", value: "3" }),
  KeyValueStore.set({ key: "api.rate_limit.requests_per_minute", value: "500" }),
  // Clean up legacy key
  KeyValueStore.delete("feature_flags.legacy_auth"),
];

for (const content of events) {
  const result = appendBlock(chain, { content, publicKey }, privateKey);
  if (!result.ok) throw new Error(result.error.message);
  chain = result.value;
}

await connector.write(chain);
console.log(`${events.length} config events appended.\n`);

// ─── Query current state ──────────────────────────────────────────────────────

const store = KeyValueStore.fromChain(chain);

console.log("Current config state:");
console.log("  payments.max_retry_count:           ", store.get("payments.max_retry_count"));
console.log(
  "  api.rate_limit.requests_per_minute: ",
  store.get("api.rate_limit.requests_per_minute"),
);
console.log("  feature_flags.new_onboarding:       ", store.get("feature_flags.new_onboarding"));
console.log(
  "  feature_flags.legacy_auth:          ",
  store.get("feature_flags.legacy_auth") ?? "(deleted)",
);

console.log("\nAll active keys:", store.keys);
console.log("Total active keys:", store.size);

// ─── Inspect full entry ───────────────────────────────────────────────────────

const entry = store.getEntry("payments.max_retry_count");
if (entry) {
  console.log("\npayments.max_retry_count entry:");
  console.log("  value:      ", entry.value);
  console.log("  setAtBlock: ", entry.setAtBlock);
}
