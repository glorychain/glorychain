import { describe, expect, it } from "vitest";
import { AppendBlockSchema, CreateChainSchema, SubmitSuggestionSchema } from "../index.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
// Ed25519 SPKI DER public key in base64url is 44 chars (with = padding stripped → 43)
const VALID_PUBLIC_KEY = "MCowBQYDK2VdAyEA".padEnd(43, "A"); // 43 base64url chars
// Ed25519 signature in base64url is exactly 86 chars
const VALID_SIGNATURE = "A".repeat(86);
const VALID_ISO = "2024-01-01T00:00:00.000Z";

// ── CreateChainSchema ─────────────────────────────────────────────────────────

describe("CreateChainSchema", () => {
  const base = { purpose: "Test chain purpose", identityType: "anonymous" as const };

  it("passes with minimal required fields", () => {
    const result = CreateChainSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("passes with all fields provided", () => {
    const result = CreateChainSchema.safeParse({
      purpose: "A test chain",
      identityType: "oauth",
      visibility: "public",
      hashAlgorithm: "sha256",
      signatureScheme: "ed25519",
    });
    expect(result.success).toBe(true);
  });

  it("fails when purpose is empty string", () => {
    const result = CreateChainSchema.safeParse({ ...base, purpose: "" });
    expect(result.success).toBe(false);
  });

  it("fails when purpose exceeds 2000 chars", () => {
    const result = CreateChainSchema.safeParse({ ...base, purpose: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("passes with purpose at exactly 2000 chars", () => {
    const result = CreateChainSchema.safeParse({ ...base, purpose: "a".repeat(2000) });
    expect(result.success).toBe(true);
  });

  it("fails when slug is too short (< 3 chars)", () => {
    const result = CreateChainSchema.safeParse({ ...base, slug: "ab" });
    expect(result.success).toBe(false);
  });

  it("fails when slug exceeds 50 chars", () => {
    const result = CreateChainSchema.safeParse({ ...base, slug: "a".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("fails when slug contains uppercase", () => {
    const result = CreateChainSchema.safeParse({ ...base, slug: "My-Chain" });
    expect(result.success).toBe(false);
  });

  it("fails when slug starts with a hyphen", () => {
    const result = CreateChainSchema.safeParse({ ...base, slug: "-abc" });
    expect(result.success).toBe(false);
  });

  it("passes with a valid slug", () => {
    const result = CreateChainSchema.safeParse({ ...base, slug: "my-chain-1" });
    expect(result.success).toBe(true);
  });

  it("fails with unknown identityType", () => {
    const result = CreateChainSchema.safeParse({ ...base, identityType: "web3" });
    expect(result.success).toBe(false);
  });

  it("fails with unknown hashAlgorithm", () => {
    const result = CreateChainSchema.safeParse({ ...base, hashAlgorithm: "md5" });
    expect(result.success).toBe(false);
  });

  it("fails with unknown signatureScheme", () => {
    const result = CreateChainSchema.safeParse({ ...base, signatureScheme: "rsa" });
    expect(result.success).toBe(false);
  });
});

// ── AppendBlockSchema ─────────────────────────────────────────────────────────

describe("AppendBlockSchema", () => {
  const base = {
    chainId: VALID_UUID,
    content: "block content",
    timestamp: VALID_ISO,
  };

  it("passes with minimal required fields", () => {
    expect(AppendBlockSchema.safeParse(base).success).toBe(true);
  });

  it("fails when chainId is not a UUID", () => {
    const result = AppendBlockSchema.safeParse({ ...base, chainId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("fails when content is empty string", () => {
    const result = AppendBlockSchema.safeParse({ ...base, content: "" });
    expect(result.success).toBe(false);
  });

  it("fails when content exceeds 50000 chars", () => {
    const result = AppendBlockSchema.safeParse({ ...base, content: "x".repeat(50001) });
    expect(result.success).toBe(false);
  });

  it("passes when content is exactly 50000 chars", () => {
    const result = AppendBlockSchema.safeParse({ ...base, content: "x".repeat(50000) });
    expect(result.success).toBe(true);
  });

  it("fails when timestamp is not ISO 8601", () => {
    const result = AppendBlockSchema.safeParse({ ...base, timestamp: "January 1 2024" });
    expect(result.success).toBe(false);
  });

  it("fails when publicKey is too short (< 43 chars)", () => {
    const result = AppendBlockSchema.safeParse({ ...base, publicKey: "abc" });
    expect(result.success).toBe(false);
  });

  it("passes with a valid publicKey (43+ base64url chars)", () => {
    const result = AppendBlockSchema.safeParse({ ...base, publicKey: VALID_PUBLIC_KEY });
    expect(result.success).toBe(true);
  });

  it("fails when signature is wrong length (not 86 chars)", () => {
    const result = AppendBlockSchema.safeParse({ ...base, signature: "A".repeat(87) });
    expect(result.success).toBe(false);
  });

  it("passes with a valid signature (exactly 86 base64url chars)", () => {
    const result = AppendBlockSchema.safeParse({
      ...base,
      publicKey: VALID_PUBLIC_KEY,
      signature: VALID_SIGNATURE,
    });
    expect(result.success).toBe(true);
  });

  it("fails when signature contains invalid base64url characters", () => {
    const result = AppendBlockSchema.safeParse({
      ...base,
      signature: "+".repeat(86), // '+' is not base64url
    });
    expect(result.success).toBe(false);
  });
});

// ── SubmitSuggestionSchema ────────────────────────────────────────────────────

describe("SubmitSuggestionSchema", () => {
  const base = { chainSlug: "my-chain", content: "suggested content" };

  it("passes with required fields", () => {
    expect(SubmitSuggestionSchema.safeParse(base).success).toBe(true);
  });

  it("fails when chainSlug is empty", () => {
    const result = SubmitSuggestionSchema.safeParse({ ...base, chainSlug: "" });
    expect(result.success).toBe(false);
  });

  it("fails when chainSlug contains spaces", () => {
    const result = SubmitSuggestionSchema.safeParse({ ...base, chainSlug: "my chain" });
    expect(result.success).toBe(false);
  });

  it("fails when content is empty", () => {
    const result = SubmitSuggestionSchema.safeParse({ ...base, content: "" });
    expect(result.success).toBe(false);
  });

  it("fails when content exceeds 50000 chars", () => {
    const result = SubmitSuggestionSchema.safeParse({ ...base, content: "x".repeat(50001) });
    expect(result.success).toBe(false);
  });

  it("fails when submitterNote exceeds 1000 chars", () => {
    const result = SubmitSuggestionSchema.safeParse({
      ...base,
      submitterNote: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("passes with submitterNote at boundary (1000 chars)", () => {
    const result = SubmitSuggestionSchema.safeParse({
      ...base,
      submitterNote: "x".repeat(1000),
    });
    expect(result.success).toBe(true);
  });
});
