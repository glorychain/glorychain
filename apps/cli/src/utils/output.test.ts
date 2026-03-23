import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isJsonMode, printHuman, printJson, setJsonMode } from "./output.js";

describe("output utilities", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    setJsonMode(false);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    setJsonMode(false);
  });

  it("printJson writes JSON to stdout", () => {
    printJson({ key: "value" });
    expect(stdoutSpy).toHaveBeenCalledWith('{\n  "key": "value"\n}\n');
  });

  it("printHuman writes label: value in human mode", () => {
    printHuman("status", "ok");
    expect(stdoutSpy).toHaveBeenCalledWith("status: ok\n");
  });

  it("printHuman writes JSON in json mode", () => {
    setJsonMode(true);
    expect(isJsonMode()).toBe(true);
    printHuman("status", "ok");
    expect(stdoutSpy).toHaveBeenCalledWith('{\n  "status": "ok"\n}\n');
  });
});
