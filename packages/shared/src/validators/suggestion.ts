import { z } from "zod";

export const SubmitSuggestionSchema = z.object({
  chainSlug: z.string().min(1),
  content: z.string().min(1).max(50000),
  submitterNote: z.string().max(1000).optional(),
});

export type SubmitSuggestionInput = z.infer<typeof SubmitSuggestionSchema>;
