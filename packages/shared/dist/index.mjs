import { z } from "zod";
//#region src/validators/chain.ts
const ContentSchemaDefinitionSchema = z.record(z.unknown()).refine((val) => val !== null && !Array.isArray(val), { message: "contentSchema must be a plain JSON object (JSON Schema v7 definition)" });
const CreateChainSchema = z.object({
	purpose: z.string().min(1).max(2e3),
	slug: z.string().min(3).max(50).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, { message: "Slug must be 3-50 characters, lowercase alphanumeric and hyphens only, cannot start or end with a hyphen" }).optional(),
	visibility: z.enum(["public", "private"]).default("public"),
	identityType: z.enum([
		"oauth",
		"external",
		"anonymous"
	]),
	externalIdentifier: z.string().max(500).optional(),
	hashAlgorithm: z.string().default("sha256"),
	signatureScheme: z.string().default("ed25519"),
	contentSchema: ContentSchemaDefinitionSchema.optional(),
	externalAnchor: z.object({
		chainType: z.string(),
		blockHash: z.string(),
		blockHeight: z.number().int().nonnegative(),
		networkId: z.string()
	}).optional()
});
const AppendBlockSchema = z.object({
	chainId: z.string().uuid(),
	content: z.string().min(1).max(5e4),
	timestamp: z.string().datetime(),
	publicKey: z.string().optional(),
	signature: z.string().optional()
});
//#endregion
//#region src/validators/suggestion.ts
const SubmitSuggestionSchema = z.object({
	chainSlug: z.string().min(1),
	content: z.string().min(1).max(5e4),
	submitterNote: z.string().max(1e3).optional()
});
//#endregion
export { AppendBlockSchema, ContentSchemaDefinitionSchema, CreateChainSchema, SubmitSuggestionSchema };

//# sourceMappingURL=index.mjs.map