import { describe, expect, it } from "vitest";
import { GitHubConnector } from "./connector.js";

const token = process.env.GITHUB_TOKEN;
const testRepo = process.env.GITHUB_TEST_REPO; // format: "owner/repo"

describe.skipIf(!token || !testRepo)("GitHubConnector integration", () => {
  function makeConnector(pollIntervalMs?: number) {
    const [owner, repo] = (testRepo as string).split("/");
    return new GitHubConnector({
      owner: owner as string,
      repo: repo as string,
      token: token as string,
      ...(pollIntervalMs !== undefined && { pollIntervalMs }),
    });
  }

  it("read returns a valid chain", async () => {
    const connector = makeConnector();
    // This test requires a chain file to already exist in the test repo.
    // It just verifies read() does not throw and returns an object.
    // Adjust chainId to match whatever test fixture is in GITHUB_TEST_REPO.
    await expect(connector.read("test-chain")).resolves.toBeDefined();
  });

  it("watch emits FILE_MISSING for non-existent chain", async () => {
    const connector = makeConnector(500);
    const iter = connector.watch("nonexistent-chain-xyz-12345") as AsyncGenerator<
      import("@glorychain/core").ThreatEvent
    >;
    const result = await iter.next();
    void iter.return?.(undefined);
    expect(result.done).toBe(false);
    expect(result.value?.type).toBe("FILE_MISSING");
  });
});
