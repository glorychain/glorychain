/**
 * 01-core-basics
 *
 * Demonstrates the core glorychain primitives:
 *   - Generate an Ed25519 keypair
 *   - Create a chain
 *   - Append blocks
 *   - Verify the chain
 *   - Inspect a block
 */

import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendBlock,
  createChain,
  generateKeypair,
  inspectBlock,
  verifyChain,
} from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";

// ─── 1. Generate a keypair ────────────────────────────────────────────────────

const keypairResult = generateKeypair();
if (!keypairResult.ok) throw new Error(keypairResult.error.message);

const { publicKey, privateKey } = keypairResult.value;
console.log("Keypair generated.");
console.log("  Public key:", publicKey);

// ─── 2. Create a chain ────────────────────────────────────────────────────────

const connector = new FsConnector(join(tmpdir(), "glorychain-examples"));

const createResult = createChain(
  {
    content: "API Platform Architecture Decisions — immutable from this point.",
    purpose: "Architecture decision register for the API platform team.",
    creatorId: "finn@glorychain.io",
    identityType: "anonymous",
    publicKey,
  },
  privateKey,
);

if (!createResult.ok) throw new Error(createResult.error.message);

await connector.write(createResult.value);
const chainId = createResult.value.metadata.chainId;
console.log("\nChain created.");
console.log("  Chain ID:", chainId);

// ─── 3. Append blocks ─────────────────────────────────────────────────────────

let chain = await connector.read(chainId);

const decisions = [
  {
    title: "Use tRPC for internal API layer",
    status: "Accepted",
    decision: "Adopt tRPC v11 for all client-server communication.",
    rationale: "End-to-end type safety eliminates an entire class of runtime errors.",
    consequences: "All API consumers must use the TypeScript client.",
    author: "finn@glorychain.io",
  },
  {
    title: "Drizzle ORM over Prisma",
    status: "Accepted",
    decision: "Use Drizzle ORM for all database access.",
    rationale:
      "Drizzle is closer to raw SQL, has zero runtime overhead, and generates fully typed queries without a separate generation step.",
    consequences: "Migrations managed via drizzle-kit. No Prisma client.",
    author: "finn@glorychain.io",
  },
  {
    title: "Ed25519 keypairs for block signing",
    status: "Accepted",
    decision:
      "Every user is issued an Ed25519 keypair on first sign-in. Private keys are AES-256-GCM encrypted at rest.",
    rationale: "Ed25519 is compact, fast, and widely supported.",
    consequences: "Loss of ENCRYPTION_KEY makes all private keys unrecoverable.",
    author: "finn@glorychain.io",
  },
];

for (const adr of decisions) {
  const appendResult = appendBlock(
    chain,
    { content: JSON.stringify(adr), publicKey },
    privateKey,
  );
  if (!appendResult.ok) throw new Error(appendResult.error.message);
  chain = appendResult.value;
}

await connector.write(chain);
console.log(`\n${decisions.length} ADRs appended.`);

// ─── 4. Verify the chain ──────────────────────────────────────────────────────

const verifyResult = await verifyChain(chain);

if (verifyResult.valid) {
  console.log(`\nVerification passed — ${verifyResult.blockCount} blocks intact.`);
} else {
  console.error("\nVerification FAILED:");
  for (const error of verifyResult.errors) {
    console.error(`  Block ${error.blockNumber}: ${error.message}`);
  }
}

// ─── 5. Inspect a block ───────────────────────────────────────────────────────

const block = chain.blocks[1];
if (block) {
  const { block: b } = inspectBlock(block);
  console.log("\nBlock 1 inspection:");
  console.log("  Signer:    ", b.publicKey);
  console.log("  Hash:      ", b.hash);
  console.log("  Prev hash: ", b.previousHash ?? "(genesis)");
  console.log("  Content:   ", JSON.parse(b.content).title);
}
