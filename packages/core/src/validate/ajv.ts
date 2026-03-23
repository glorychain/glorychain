// createAjvValidator — reference ContentValidator implementation using Ajv (JSON Schema v7).
//
// This file is NOT imported by appendBlock() or verifyChain() — it is opt-in only.
// @glorychain/core declares ajv as a peerDependency to preserve the zero-runtime-deps guarantee.
//
// Usage:
//   import { appendBlock, createAjvValidator } from "@glorychain/core";
//   const validator = createAjvValidator();
//   const result = appendBlock(chain, input, privateKey, { validateContent: validator });

import type { JsonSchemaV7 } from "../schema/block.js";
import type { ContentValidationResult, ContentValidator } from "./types.js";

// biome-ignore lint/suspicious/noExplicitAny: Ajv types vary by version; dynamic import
type AjvInstance = any;
type AjvConstructor = new (options: Record<string, unknown>) => AjvInstance;

export function createAjvValidator(): ContentValidator {
  // Lazy-load Ajv so it only instantiates when the validator is first called.
  // This keeps core's startup cost zero for callers who don't use schema validation.
  let ajvInstance: AjvInstance | undefined;
  const compiledSchemas = new WeakMap<JsonSchemaV7, AjvInstance>();

  function getAjv(): AjvInstance {
    if (ajvInstance !== undefined) return ajvInstance;
    // Dynamic require — only executes when createAjvValidator is actually used.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AjvCtor = require("ajv") as { default?: AjvConstructor } | AjvConstructor;
    const Ajv: AjvConstructor =
      typeof AjvCtor === "function" ? AjvCtor : (AjvCtor as { default: AjvConstructor }).default;
    ajvInstance = new Ajv({ allErrors: true, strict: false });
    return ajvInstance;
  }

  return (content: string, schema: JsonSchemaV7): ContentValidationResult => {
    // Step 1: parse content as JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return {
        valid: false,
        errors: [{ path: "/", message: "block content is not valid JSON" }],
      };
    }

    // Step 2: compile schema (cached per schema object reference)
    const ajv = getAjv();
    let validate = compiledSchemas.get(schema);
    if (validate === undefined) {
      validate = ajv.compile(schema) as AjvInstance;
      compiledSchemas.set(schema, validate);
    }

    // Step 3: validate
    const valid = (validate as (data: unknown) => boolean)(parsed);
    if (valid) return { valid: true };

    // biome-ignore lint/suspicious/noExplicitAny: Ajv error shape
    const ajvErrors: any[] = (validate as any).errors ?? [];
    return {
      valid: false,
      errors: ajvErrors.map((e) => ({
        path: (e.instancePath as string) || "/",
        message: (e.message as string) ?? "validation failed",
      })),
    };
  };
}
