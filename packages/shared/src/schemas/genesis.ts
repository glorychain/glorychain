import { z } from "zod";

/**
 * Structured genesis block content schema (JSON variant).
 *
 * Used by chains that have a named structure type.
 * The `author` field is the creator's public key or user ID.
 * The `schema` field is an optional JSON Schema object.
 */
export const GenesisBlockContentSchema = z.object({
  title: z.string().min(1),
  purpose: z.string(),
  author: z.string(),
  createdAt: z.string().datetime(),
  schema: z.record(z.unknown()).nullable(),
});

export type GenesisBlockContent = z.infer<typeof GenesisBlockContentSchema>;

/**
 * Unstructured genesis block content schema (markdown frontmatter variant).
 *
 * Validated by parsing the YAML front-matter block; the remainder is free prose.
 */
export const GenesisFrontmatterSchema = z.object({
  title: z.string().min(1),
  purpose: z.string(),
  author: z.string(),
  createdAt: z.string().datetime(),
});

export type GenesisFrontmatter = z.infer<typeof GenesisFrontmatterSchema>;
