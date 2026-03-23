import { z } from "zod";

//#region src/validators/chain.d.ts
declare const ContentSchemaDefinitionSchema: z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnknown>, Record<string, unknown>, Record<string, unknown>>;
type ContentSchemaDefinition = z.infer<typeof ContentSchemaDefinitionSchema>;
declare const CreateChainSchema: z.ZodObject<{
  purpose: z.ZodString;
  slug: z.ZodOptional<z.ZodString>;
  visibility: z.ZodDefault<z.ZodEnum<["public", "private"]>>;
  identityType: z.ZodEnum<["oauth", "external", "anonymous"]>;
  externalIdentifier: z.ZodOptional<z.ZodString>;
  hashAlgorithm: z.ZodDefault<z.ZodString>;
  signatureScheme: z.ZodDefault<z.ZodString>;
  contentSchema: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnknown>, Record<string, unknown>, Record<string, unknown>>>;
  externalAnchor: z.ZodOptional<z.ZodObject<{
    chainType: z.ZodString;
    blockHash: z.ZodString;
    blockHeight: z.ZodNumber;
    networkId: z.ZodString;
  }, "strip", z.ZodTypeAny, {
    chainType: string;
    blockHash: string;
    blockHeight: number;
    networkId: string;
  }, {
    chainType: string;
    blockHash: string;
    blockHeight: number;
    networkId: string;
  }>>;
}, "strip", z.ZodTypeAny, {
  purpose: string;
  visibility: "public" | "private";
  identityType: "oauth" | "external" | "anonymous";
  hashAlgorithm: string;
  signatureScheme: string;
  slug?: string | undefined;
  externalIdentifier?: string | undefined;
  contentSchema?: Record<string, unknown> | undefined;
  externalAnchor?: {
    chainType: string;
    blockHash: string;
    blockHeight: number;
    networkId: string;
  } | undefined;
}, {
  purpose: string;
  identityType: "oauth" | "external" | "anonymous";
  slug?: string | undefined;
  visibility?: "public" | "private" | undefined;
  externalIdentifier?: string | undefined;
  hashAlgorithm?: string | undefined;
  signatureScheme?: string | undefined;
  contentSchema?: Record<string, unknown> | undefined;
  externalAnchor?: {
    chainType: string;
    blockHash: string;
    blockHeight: number;
    networkId: string;
  } | undefined;
}>;
type CreateChainInput = z.infer<typeof CreateChainSchema>;
declare const AppendBlockSchema: z.ZodObject<{
  chainId: z.ZodString;
  content: z.ZodString;
  timestamp: z.ZodString;
  publicKey: z.ZodOptional<z.ZodString>;
  signature: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
  chainId: string;
  content: string;
  timestamp: string;
  publicKey?: string | undefined;
  signature?: string | undefined;
}, {
  chainId: string;
  content: string;
  timestamp: string;
  publicKey?: string | undefined;
  signature?: string | undefined;
}>;
type AppendBlockInput = z.infer<typeof AppendBlockSchema>;
//#endregion
//#region src/validators/suggestion.d.ts
declare const SubmitSuggestionSchema: z.ZodObject<{
  chainSlug: z.ZodString;
  content: z.ZodString;
  submitterNote: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
  content: string;
  chainSlug: string;
  submitterNote?: string | undefined;
}, {
  content: string;
  chainSlug: string;
  submitterNote?: string | undefined;
}>;
type SubmitSuggestionInput = z.infer<typeof SubmitSuggestionSchema>;
//#endregion
export { type AppendBlockInput, AppendBlockSchema, type ContentSchemaDefinition, ContentSchemaDefinitionSchema, type CreateChainInput, CreateChainSchema, type SubmitSuggestionInput, SubmitSuggestionSchema };
//# sourceMappingURL=index.d.mts.map