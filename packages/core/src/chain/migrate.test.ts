import { describe, expect, it } from "vitest";
import { generateKeypair } from "../crypto/keygen.js";
import { createChain } from "./create.js";
import { migrateChain } from "./migrate.js";

function makeChain() {
  const kp = generateKeypair();
  if (!kp.ok) throw new Error("keygen failed");
  const chain = createChain(
    {
      content: "genesis",
      purpose: "test",
      creatorId: "user1",
      identityType: "anonymous",
      publicKey: kp.value.publicKey,
    },
    kp.value.privateKey,
  );
  if (!chain.ok) throw new Error("createChain failed");
  return chain.value;
}

describe("migrateChain", () => {
  it("appends migration event to migrationHistory", () => {
    const chain = makeChain();
    const migrated = migrateChain(chain, "fs", "github", "moving to github");
    expect(migrated.metadata.migrationHistory.length).toBe(1);
    const event = migrated.metadata.migrationHistory[0];
    expect(event?.fromConnector).toBe("fs");
    expect(event?.toConnector).toBe("github");
    expect(event?.reason).toBe("moving to github");
  });

  it("does not mutate original chain", () => {
    const chain = makeChain();
    migrateChain(chain, "fs", "github");
    expect(chain.metadata.migrationHistory.length).toBe(0);
  });

  it("can record multiple migrations", () => {
    const chain = makeChain();
    const m1 = migrateChain(chain, "fs", "github");
    const m2 = migrateChain(m1, "github", "fs", "reverting");
    expect(m2.metadata.migrationHistory.length).toBe(2);
  });

  it("migration event has ISO8601 timestamp", () => {
    const chain = makeChain();
    const migrated = migrateChain(chain, "fs", "github");
    const ts = migrated.metadata.migrationHistory[0]?.timestamp;
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
