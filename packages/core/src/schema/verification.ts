import type { SchemaValidationError } from "./block.js";
import type { ErrorCodeValue } from "./errors.js";

// VerificationError — a single error encountered during chain verification.
// Carries the block number where it occurred and optional schema detail for SCHEMA_VIOLATION.
export interface VerificationError {
  code: ErrorCodeValue;
  blockNumber: number;
  message: string;
  schemaErrors?: SchemaValidationError[]; // present only for SCHEMA_VIOLATION
}

export interface VerificationResult {
  valid: boolean;
  errors: VerificationError[];
  blockCount: number;
  lastVerifiedBlock: number; // 0-based index of last successfully verified block
}
