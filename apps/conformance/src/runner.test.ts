import { describe, expect, it, vi } from "vitest";
import type { Suite } from "./runner.js";
import { runSuites } from "./runner.js";

describe("runSuites", () => {
  it("outputs TAP for passing suites", async () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const suites: Suite[] = [
      { name: "suite one", run: async () => ({ passed: true, name: "suite one" }) },
    ];
    await runSuites(suites);
    const output = spy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("TAP version 14");
    expect(output).toContain("1..1");
    expect(output).toContain("ok 1 - suite one");
    spy.mockRestore();
  });

  it("marks failed suite as not ok", async () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const suites: Suite[] = [
      {
        name: "failing suite",
        run: async () => ({ passed: false, name: "failing suite", error: "oops" }),
      },
    ];
    await runSuites(suites);
    const output = spy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("not ok 1 - failing suite");
    expect(exitSpy).toHaveBeenCalledWith(1);
    spy.mockRestore();
    exitSpy.mockRestore();
  });

  it("outputs JSON when json option is set", async () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const suites: Suite[] = [
      { name: "json suite", run: async () => ({ passed: true, name: "json suite" }) },
    ];
    await runSuites(suites, { json: true });
    const output = spy.mock.calls.map((c) => c[0]).join("");
    const parsed = JSON.parse(output) as Array<{ name: string; passed: boolean }>;
    expect(parsed[0]?.name).toBe("json suite");
    spy.mockRestore();
  });
});
