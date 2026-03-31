import { z } from "zod";

/**
 * Validates that a `contentSchema` value is a plain JSON object.
 *
 * The object is not validated as a correct JSON Schema here — that happens at
 * runtime when blocks are appended via `appendBlock()`. This validator ensures
 * it is a non-null, non-array plain object that can be safely serialised into
 * the genesis canonical payload.
 */
export const ContentSchemaDefinitionSchema = z
  .record(z.unknown())
  .refine((val) => val !== null && !Array.isArray(val), {
    message: "contentSchema must be a plain JSON object (JSON Schema v7 definition)",
  });

/** Inferred type for a validated content schema definition. */
export type ContentSchemaDefinition = z.infer<typeof ContentSchemaDefinitionSchema>;

/**
 * Input schema for creating a new GloryChain.
 *
 * - `purpose` — human-readable description of the chain's intent (1–2000 chars).
 * - `slug` — optional URL slug (3–50 chars, lowercase alphanumeric + hyphens).
 * - `visibility` — `"public"` (default) or `"private"`.
 * - `identityType` — how block authors are identified: `"oauth"`, `"external"`, or `"anonymous"`.
 * - `hashAlgorithm` — hashing algorithm for block hashes; only `"sha256"` is currently supported.
 * - `signatureScheme` — signing algorithm; only `"ed25519"` is currently supported.
 * - `contentSchema` — optional JSON Schema v7 object constraining block content.
 * - `externalAnchor` — optional reference to an external blockchain for provenance attestation.
 */
export const CreateChainSchema = z.object({
  purpose: z.string().min(1).max(2000),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
      message:
        "Slug must be 3-50 characters, lowercase alphanumeric and hyphens only, cannot start or end with a hyphen",
    })
    .optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  identityType: z.enum(["oauth", "external", "anonymous"]),
  externalIdentifier: z.string().max(500).optional(),
  hashAlgorithm: z.enum(["sha256"]).default("sha256"),
  signatureScheme: z.enum(["ed25519"]).default("ed25519"),
  contentSchema: ContentSchemaDefinitionSchema.optional(),
  externalAnchor: z
    .object({
      chainType: z.string(),
      blockHash: z.string(),
      blockHeight: z.number().int().nonnegative(),
      networkId: z.string(),
    })
    .optional(),
});

/** Inferred type for a validated create-chain request. */
export type CreateChainInput = z.infer<typeof CreateChainSchema>;

/**
 * Input schema for appending a block to an existing GloryChain.
 *
 * - `chainId` — UUID v4 of the target chain.
 * - `content` — block content string (1–50 000 chars).
 * - `timestamp` — ISO 8601 datetime string (UTC recommended).
 * - `publicKey` — optional base64url-encoded Ed25519 public key (≥ 43 chars).
 *   Required when `signature` is provided.
 * - `signature` — optional base64url-encoded Ed25519 signature (exactly 86 chars).
 *   Must be the signature over the block's canonical payload.
 */
export const AppendBlockSchema = z.object({
  chainId: z.string().uuid(),
  content: z.string().min(1).max(50000),
  timestamp: z.string().datetime(),
  publicKey: z
    .string()
    .regex(/^[A-Za-z0-9_-]{43,}$/, {
      message: "publicKey must be a base64url-encoded public key (min 43 chars)",
    })
    .optional(),
  signature: z
    .string()
    .regex(/^[A-Za-z0-9_-]{86}$/, {
      message: "signature must be a base64url-encoded Ed25519 signature (exactly 86 chars)",
    })
    .optional(),
});

/** Inferred type for a validated append-block request. */
export type AppendBlockInput = z.infer<typeof AppendBlockSchema>;
