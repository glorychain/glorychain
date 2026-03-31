import type { SchemaValidationError } from "./block.js";

// ErrorCode — const object (not enum) for zero bundle overhead and correct type narrowing
export const ErrorCode = {
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  BROKEN_CHAIN: "BROKEN_CHAIN",
  REPLAY_DETECTED: "REPLAY_DETECTED",
  ALGORITHM_UNSUPPORTED: "ALGORITHM_UNSUPPORTED",
  CHAIN_NOT_FOUND: "CHAIN_NOT_FOUND",
  KEY_MISMATCH: "KEY_MISMATCH",
  FUTURE_TIMESTAMP: "FUTURE_TIMESTAMP",
  DUPLICATE_BLOCK: "DUPLICATE_BLOCK",
  SCHEMA_VIOLATION: "SCHEMA_VIOLATION", // block content failed genesis contentSchema validation
  MISSING_KEY: "MISSING_KEY", // no public key available for block verification
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface GloryChainError {
  code: ErrorCodeValue;
  message: string;
  blockNumber?: number; // which block triggered the error, if applicable
  schemaErrors?: SchemaValidationError[]; // present only for SCHEMA_VIOLATION
}

// Result<T, E> — discriminated union. Default E = GloryChainError.
// Use ok: true to access value; ok: false to access error.
// Never throw for expected errors — return Result instead.
export type Result<T, E = GloryChainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
