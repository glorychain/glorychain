import { describe, expect, expectTypeOf, it } from "vitest";
import type { ErrorCodeValue, GloryChainError, Result } from "./errors.js";
import { ErrorCode } from "./errors.js";

describe("ErrorCode", () => {
  it("is a const object with all 10 error codes", () => {
    expect(ErrorCode.INVALID_SIGNATURE).toBe("INVALID_SIGNATURE");
    expect(ErrorCode.BROKEN_CHAIN).toBe("BROKEN_CHAIN");
    expect(ErrorCode.REPLAY_DETECTED).toBe("REPLAY_DETECTED");
    expect(ErrorCode.ALGORITHM_UNSUPPORTED).toBe("ALGORITHM_UNSUPPORTED");
    expect(ErrorCode.CHAIN_NOT_FOUND).toBe("CHAIN_NOT_FOUND");
    expect(ErrorCode.KEY_MISMATCH).toBe("KEY_MISMATCH");
    expect(ErrorCode.FUTURE_TIMESTAMP).toBe("FUTURE_TIMESTAMP");
    expect(ErrorCode.DUPLICATE_BLOCK).toBe("DUPLICATE_BLOCK");
    expect(ErrorCode.SCHEMA_VIOLATION).toBe("SCHEMA_VIOLATION");
    expect(ErrorCode.MISSING_KEY).toBe("MISSING_KEY");
  });

  it("has exactly 10 keys", () => {
    expect(Object.keys(ErrorCode).length).toBe(10);
  });
});

describe("GloryChainError", () => {
  it("has correct field types", () => {
    expectTypeOf<GloryChainError["code"]>().toEqualTypeOf<ErrorCodeValue>();
    expectTypeOf<GloryChainError["message"]>().toEqualTypeOf<string>();
    expectTypeOf<GloryChainError["blockNumber"]>().toEqualTypeOf<number | undefined>();
  });
});

describe("Result<T, E>", () => {
  it("ok: true branch has value", () => {
    type OkResult = Extract<Result<string>, { ok: true }>;
    expectTypeOf<OkResult["value"]>().toEqualTypeOf<string>();
  });

  it("ok: false branch has error", () => {
    type ErrResult = Extract<Result<string>, { ok: false }>;
    expectTypeOf<ErrResult["error"]>().toEqualTypeOf<GloryChainError>();
  });

  it("defaults E to GloryChainError", () => {
    type DefaultErr = Extract<Result<number>, { ok: false }>;
    expectTypeOf<DefaultErr["error"]>().toEqualTypeOf<GloryChainError>();
  });

  it("accepts custom error type", () => {
    type CustomError = { kind: "custom"; detail: string };
    type CustomResult = Result<number, CustomError>;
    type ErrBranch = Extract<CustomResult, { ok: false }>;
    expectTypeOf<ErrBranch["error"]>().toEqualTypeOf<CustomError>();
  });

  it("narrows correctly in if/else", () => {
    function test(r: Result<string>): string {
      if (r.ok) {
        return r.value.toUpperCase();
      }
      return r.error.code;
    }
    expectTypeOf(test).toBeFunction();
  });
});
