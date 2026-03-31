import { z } from "zod";

/**
 * Input schema for submitting a block suggestion to a public chain.
 *
 * - `chainSlug` — the slug identifying the target chain (3–50 chars, lowercase alphanumeric + hyphens).
 * - `content` — the proposed block content (1–50 000 chars).
 * - `submitterNote` — optional note from the submitter to the chain owner (max 1000 chars).
 */
export const SubmitSuggestionSchema = z.object({
  chainSlug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
      message:
        "chainSlug must be 3-50 characters, lowercase alphanumeric and hyphens only, cannot start or end with a hyphen",
    }),
  content: z.string().min(1).max(50000),
  submitterNote: z.string().max(1000).optional(),
});

/** Inferred type for a validated submit-suggestion request. */
export type SubmitSuggestionInput = z.infer<typeof SubmitSuggestionSchema>;
