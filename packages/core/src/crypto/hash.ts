import { createHash } from "node:crypto";
import type { GloryChainError, Result } from "../schema/errors.js";
import { ErrorCode } from "../schema/errors.js";

const SUPPORTED_HASH_ALGORITHMS = new Set(["sha256"]);

export function hashBlock(payload: string, algorithm = "sha256"): Result<string, GloryChainError> {
  const algo = algorithm.toLowerCase();
  if (!SUPPORTED_HASH_ALGORITHMS.has(algo)) {
    return {
      ok: false,
      error: {
        code: ErrorCode.ALGORITHM_UNSUPPORTED,
        message: `Unsupported hash algorithm: ${algorithm}`,
      },
    };
  }
  const hash = createHash(algo).update(payload, "utf8").digest("hex");
  return { ok: true, value: hash };
}
