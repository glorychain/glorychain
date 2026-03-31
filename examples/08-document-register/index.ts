/**
 * 08-document-register
 *
 * Policy document register with version tracking.
 * Documents can be published, superseded, withdrawn, and restored.
 * The full provenance chain — who published what version, and when — is on-chain.
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendBlock, createAjvValidator, createChain, generateKeypair } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { DocumentRegister } from "@glorychain/structures";

const { value: keypair } = generateKeypair()!;
const { publicKey, privateKey } = keypair;
const validator = createAjvValidator();

const connector = new FsConnector(join(tmpdir(), "glorychain-examples"));

// ─── Create chain ─────────────────────────────────────────────────────────────

const createResult = createChain(
  {
    content: "GloryChain policy document register.",
    purpose: "policy-register",
    creatorId: "compliance@glorychain.io",
    identityType: "anonymous",
    publicKey,
    contentSchema: DocumentRegister.genesisSchema,
  },
  privateKey,
);
if (!createResult.ok) throw new Error(createResult.error.message);

let chain = createResult.value;
console.log("Chain created:", chain.metadata.chainId);

// ─── Append document events ───────────────────────────────────────────────────

const events = [
  DocumentRegister.publish({
    id: "POL-INFOSEC-001",
    title: "Information Security Policy",
    hash: "sha256:abc1234567890abcdef",
    version: "1.0",
    metadata: { owner: "ciso@glorychain.io", review_date: "2027-01-01" },
  }),
  DocumentRegister.publish({
    id: "POL-PRIVACY-001",
    title: "Privacy Policy",
    hash: "sha256:def9876543210fedcba",
    version: "1.0",
    metadata: { owner: "dpo@glorychain.io" },
  }),
  // New version of InfoSec policy — publish new, then mark old as superseded
  DocumentRegister.publish({
    id: "POL-INFOSEC-002",
    title: "Information Security Policy",
    hash: "sha256:abc999newversionhash",
    version: "2.0",
    metadata: { owner: "ciso@glorychain.io", review_date: "2028-01-01" },
  }),
  DocumentRegister.supersede({
    id: "POL-INFOSEC-001",
    supersededBy: "POL-INFOSEC-002",
  }),
  // Privacy policy temporarily withdrawn pending legal review
  DocumentRegister.withdraw({
    id: "POL-PRIVACY-001",
    reason: "Under legal review — temporarily withdrawn",
  }),
  DocumentRegister.restore({
    id: "POL-PRIVACY-001",
    reason: "Legal review complete. No changes required.",
  }),
];

for (const content of events) {
  const result = appendBlock(chain, { content, publicKey }, privateKey, { validateContent: validator });
  if (!result.ok) throw new Error(result.error.message);
  chain = result.value;
}

await connector.write(chain);
console.log(`${events.length} document events appended.\n`);

// ─── Query current state ──────────────────────────────────────────────────────

const register = DocumentRegister.fromChain(chain);

console.log("All documents:");
for (const d of register.all) {
  console.log(`  [${d.id}] v${d.version} — ${d.title} (${d.status})`);
  if (d.supersedes) console.log(`    supersedes: ${d.supersedes}`);
}

console.log("\nCurrently published:", register.current.map((d) => d.id));
console.log("Superseded:", register.superseded.map((d) => d.id));
console.log("Withdrawn:", register.withdrawn.map((d) => d.id));

// Look up by content hash
const found = register.byHash("sha256:abc999newversionhash");
if (found) {
  console.log(`\nHash lookup — found: ${found.id} v${found.version}`);
}
