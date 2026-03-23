import { describe, expect, it } from "vitest";
import { getPagesUrl } from "./pages.js";

describe("getPagesUrl", () => {
  it("generates correct GitHub Pages URL with default dir", () => {
    const url = getPagesUrl({ owner: "alice", repo: "my-chain", token: "tok" }, "chain-123");
    expect(url).toBe("https://alice.github.io/my-chain/chains/chain-123.json");
  });

  it("uses custom dir when specified", () => {
    const url = getPagesUrl(
      { owner: "alice", repo: "my-chain", token: "tok", dir: "data" },
      "chain-abc",
    );
    expect(url).toBe("https://alice.github.io/my-chain/data/chain-abc.json");
  });
});
