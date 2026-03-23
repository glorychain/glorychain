import type { JsonSchemaV7, SchemaValidationError } from "../schema/block.js";

// ContentValidationResult — returned by a ContentValidator
export type ContentValidationResult =
  | { valid: true }
  | { valid: false; errors: SchemaValidationError[] };

// ContentValidator — a function that validates a block's content string against a JSON Schema v7 definition.
// The content string must be parseable as JSON and conform to the schema.
//
// This type is the injection point for schema validation in appendBlock() and verifyChain().
// Callers that need validation provide a ContentValidator; callers that don't are unaffected.
//
// Reference implementation: createAjvValidator() from @glorychain/core
export type ContentValidator = (content: string, schema: JsonSchemaV7) => ContentValidationResult;
