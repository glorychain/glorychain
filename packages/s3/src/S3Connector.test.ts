import type { Chain, GenesisBlock } from "@glorychain/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory store shared across mock instances in a test run
const store = new Map<string, string>();

vi.mock("@aws-sdk/client-s3", () => {
  class S3Client {
    async send(command: { __type: string; input: Record<string, string> }): Promise<unknown> {
      const name = command.__type;
      const input = command.input;

      if (name === "PutObjectCommand") {
        store.set(input.Key!, input.Body!);
        return {};
      }
      if (name === "GetObjectCommand") {
        const body = store.get(input.Key!);
        if (!body) {
          const err = Object.assign(new Error("NoSuchKey"), { name: "NoSuchKey" });
          throw err;
        }
        return { Body: { transformToString: () => Promise.resolve(body) } };
      }
      if (name === "HeadObjectCommand") {
        if (!store.has(input.Key!)) throw new Error("NotFound");
        return {};
      }
      if (name === "ListObjectsV2Command") {
        const prefix = input.Prefix!;
        const contents = [...store.keys()]
          .filter((k) => k.startsWith(prefix))
          .map((Key) => ({ Key }));
        return { Contents: contents };
      }
      if (name === "DeleteObjectCommand") {
        store.delete(input.Key!);
        return {};
      }
      return {};
    }
  }

  function makeCommand(type: string) {
    return class {
      __type = type;
      input: Record<string, string>;
      constructor(input: Record<string, string>) {
        this.input = input;
      }
    };
  }

  return {
    S3Client,
    PutObjectCommand: makeCommand("PutObjectCommand"),
    GetObjectCommand: makeCommand("GetObjectCommand"),
    HeadObjectCommand: makeCommand("HeadObjectCommand"),
    ListObjectsV2Command: makeCommand("ListObjectsV2Command"),
    DeleteObjectCommand: makeCommand("DeleteObjectCommand"),
  };
});

// Import after mock is set up
const { S3Connector } = await import("./S3Connector.js");

function makeChain(id: string): Chain {
  const genesis: GenesisBlock = {
    blockNumber: 0,
    chainId: id,
    content: "Test chain",
    timestamp: "2026-01-01T00:00:00.000Z" as never,
    previousHash: null,
    hash: `genesis-hash-${id}`,
    signature: "sig",
    publicKey: "pubkey",
    protocolVersion: "0.1",
    creatorId: "test",
    purpose: "test",
    identityType: "anonymous",
    hashAlgorithm: "sha256",
    signatureScheme: "ed25519",
  };
  return {
    blocks: [genesis],
    metadata: { chainId: id },
  } as unknown as Chain;
}

describe("S3Connector", () => {
  beforeEach(() => {
    store.clear();
  });

  it("writes and reads a chain", async () => {
    const connector = new S3Connector({ bucket: "test-bucket" });
    const chain = makeChain("chain-001");
    await connector.write(chain);
    const read = await connector.read("chain-001");
    expect(read.metadata.chainId).toBe("chain-001");
  });

  it("exists returns true after write", async () => {
    const connector = new S3Connector({ bucket: "test-bucket" });
    await connector.write(makeChain("chain-002"));
    expect(await connector.exists("chain-002")).toBe(true);
  });

  it("exists returns false for unknown chain", async () => {
    const connector = new S3Connector({ bucket: "test-bucket" });
    expect(await connector.exists("does-not-exist")).toBe(false);
  });

  it("list returns written chain ids", async () => {
    const connector = new S3Connector({ bucket: "test-bucket", prefix: "list-test" });
    await connector.write(makeChain("list-a"));
    await connector.write(makeChain("list-b"));
    const ids = await connector.list();
    expect(ids).toContain("list-a");
    expect(ids).toContain("list-b");
  });

  it("delete removes a chain", async () => {
    const connector = new S3Connector({ bucket: "test-bucket", prefix: "del-test" });
    await connector.write(makeChain("del-chain"));
    await connector.delete("del-chain");
    expect(await connector.exists("del-chain")).toBe(false);
  });

  it("uses custom prefix in key path", async () => {
    const connector = new S3Connector({ bucket: "test-bucket", prefix: "my-prefix" });
    await connector.write(makeChain("prefixed-chain"));
    const ids = await connector.list();
    expect(ids).toContain("prefixed-chain");
  });
});
