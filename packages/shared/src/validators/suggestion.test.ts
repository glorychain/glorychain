import { describe, expect, it } from "vitest";
import { SubmitSuggestionSchema } from "./suggestion.js";

describe("SubmitSuggestionSchema", () => {
  describe("valid inputs", () => {
    it("accepts minimal valid input", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "my-ngo-chain",
        content: "Proposed: approve Q2 budget",
      });
      expect(result.success).toBe(true);
    });

    it("accepts full valid input with submitterNote", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "my-ngo-chain",
        content: "Proposed: approve Q2 budget",
        submitterNote: "I am a community member who reviewed the financials",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("chainSlug validation", () => {
    it("rejects empty chainSlug", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "",
        content: "Test content",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("chainSlug");
      }
    });

    it("rejects missing chainSlug", () => {
      const result = SubmitSuggestionSchema.safeParse({
        content: "Test content",
      });
      expect(result.success).toBe(false);
    });

    it("rejects chainSlug shorter than 3 chars", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "ab",
        content: "Test content",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("chainSlug");
      }
    });

    it("rejects chainSlug longer than 50 chars", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "a".repeat(51),
        content: "Test content",
      });
      expect(result.success).toBe(false);
    });

    it("rejects chainSlug with uppercase letters", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "MyChain",
        content: "Test content",
      });
      expect(result.success).toBe(false);
    });

    it("rejects chainSlug starting with a hyphen", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "-my-chain",
        content: "Test content",
      });
      expect(result.success).toBe(false);
    });

    it("rejects chainSlug ending with a hyphen", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "my-chain-",
        content: "Test content",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid slug with hyphens in the middle", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "my-ngo-chain",
        content: "Test content",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("content validation", () => {
    it("rejects empty content", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "my-chain",
        content: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("content");
      }
    });

    it("rejects content over 50000 chars", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "my-chain",
        content: "a".repeat(50001),
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing content", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "my-chain",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("submitterNote validation", () => {
    it("rejects submitterNote over 1000 chars", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "my-chain",
        content: "Valid content",
        submitterNote: "a".repeat(1001),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("submitterNote");
      }
    });

    it("accepts submitterNote at exactly 1000 chars", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "my-chain",
        content: "Valid content",
        submitterNote: "a".repeat(1000),
      });
      expect(result.success).toBe(true);
    });

    it("accepts missing submitterNote", () => {
      const result = SubmitSuggestionSchema.safeParse({
        chainSlug: "my-chain",
        content: "Valid content",
      });
      expect(result.success).toBe(true);
    });
  });
});
