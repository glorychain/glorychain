import { z } from "zod";

// ContentSchemaDefinitionSchema — validates that a contentSchema value is a plain JSON object.
// The object is not validated as a correct JSON Schema here — that happens at runtime when
// blocks are appended via appendBlock(). This validator ensures it's a non-null, non-array
// plain object that can be safely serialised into the genesis canonical payload.
export const ContentSchemaDefinitionSchema = z
  .record(z.unknown())
  .refine((val) => val !== null && !Array.isArray(val), {
    message: "contentSchema must be a plain JSON object (JSON Schema v7 definition)",
  });

export type ContentSchemaDefinition = z.infer<typeof ContentSchemaDefinitionSchema>;

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
  hashAlgorithm: z.string().default("sha256"),
  signatureScheme: z.string().default("ed25519"),
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

export type CreateChainInput = z.infer<typeof CreateChainSchema>;

export const AppendBlockSchema = z.object({
  chainId: z.string().uuid(),
  content: z.string().min(1).max(50000),
  timestamp: z.string().datetime(),
  publicKey: z.string().optional(),
  signature: z.string().optional(),
});

export type AppendBlockInput = z.infer<typeof AppendBlockSchema>;
