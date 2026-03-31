import { describe, expect, it } from "vitest";
import { AppendBlockSchema, CreateChainSchema } from "./chain.js";

describe("CreateChainSchema", () => {
  describe("valid inputs", () => {
    it("accepts minimal valid input", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Track our NGO governance decisions",
        identityType: "oauth",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visibility).toBe("public");
        expect(result.data.hashAlgorithm).toBe("sha256");
        expect(result.data.signatureScheme).toBe("ed25519");
      }
    });

    it("accepts full valid input", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Full chain",
        slug: "my-ngo-chain",
        visibility: "private",
        identityType: "external",
        externalIdentifier: "https://example.org/identity",
        hashAlgorithm: "sha256",
        signatureScheme: "ed25519",
        externalAnchor: {
          chainType: "bitcoin",
          blockHash: "000000000000000000024bead8df69990852c202db0e0097c1a12ea637d7e96d",
          blockHeight: 840000,
          networkId: "mainnet",
        },
      });
      expect(result.success).toBe(true);
    });

    it("accepts anonymous identityType", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Anonymous chain",
        identityType: "anonymous",
      });
      expect(result.success).toBe(true);
    });

    it("accepts slug at minimum length (3 chars)", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Short slug test",
        identityType: "oauth",
        slug: "abc",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("purpose validation", () => {
    it("rejects empty purpose", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "",
        identityType: "oauth",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("purpose");
      }
    });

    it("rejects purpose over 2000 chars", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "a".repeat(2001),
        identityType: "oauth",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("purpose");
      }
    });

    it("rejects missing purpose", () => {
      const result = CreateChainSchema.safeParse({ identityType: "oauth" });
      expect(result.success).toBe(false);
    });
  });

  describe("slug validation", () => {
    it("rejects slug shorter than 3 chars", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Test",
        identityType: "oauth",
        slug: "ab",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("slug");
      }
    });

    it("rejects slug longer than 50 chars", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Test",
        identityType: "oauth",
        slug: "a".repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it("rejects slug starting with hyphen", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Test",
        identityType: "oauth",
        slug: "-invalid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects slug ending with hyphen", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Test",
        identityType: "oauth",
        slug: "invalid-",
      });
      expect(result.success).toBe(false);
    });

    it("rejects uppercase slug", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Test",
        identityType: "oauth",
        slug: "MySlug",
      });
      expect(result.success).toBe(false);
    });

    it("accepts slug with hyphens in middle", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Test",
        identityType: "oauth",
        slug: "my-valid-slug",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("identityType validation", () => {
    it("rejects invalid identityType", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Test",
        identityType: "unknown",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("identityType");
      }
    });

    it("rejects missing identityType", () => {
      const result = CreateChainSchema.safeParse({ purpose: "Test" });
      expect(result.success).toBe(false);
    });
  });

  describe("visibility validation", () => {
    it("rejects invalid visibility value", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Test",
        identityType: "oauth",
        visibility: "unlisted",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("externalAnchor validation", () => {
    it("rejects externalAnchor with negative blockHeight", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Test",
        identityType: "oauth",
        externalAnchor: {
          chainType: "bitcoin",
          blockHash: "abc123",
          blockHeight: -1,
          networkId: "mainnet",
        },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("blockHeight");
      }
    });

    it("rejects externalAnchor with float blockHeight", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Test",
        identityType: "oauth",
        externalAnchor: {
          chainType: "bitcoin",
          blockHash: "abc123",
          blockHeight: 1.5,
          networkId: "mainnet",
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects externalAnchor with missing required field", () => {
      const result = CreateChainSchema.safeParse({
        purpose: "Test",
        identityType: "oauth",
        externalAnchor: {
          chainType: "bitcoin",
          blockHash: "abc123",
          blockHeight: 100,
          // networkId missing
        },
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("AppendBlockSchema", () => {
  const validChainId = "550e8400-e29b-41d4-a716-446655440000";

  describe("valid inputs", () => {
    it("accepts valid minimal input", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "Board approved Q1 budget",
        timestamp: "2026-03-22T10:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("accepts full valid input with optional fields", () => {
      // publicKey: 59-char base64url string (Ed25519 SPKI DER format)
      // signature: 86-char base64url string (Ed25519 raw signature format)
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "Signed decision",
        timestamp: "2026-03-22T10:00:00.000Z",
        publicKey: "A".repeat(59),
        signature: "A".repeat(86),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("chainId validation", () => {
    it("rejects non-UUID chainId", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: "not-a-uuid",
        content: "Test",
        timestamp: "2026-03-22T10:00:00.000Z",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("chainId");
      }
    });

    it("rejects missing chainId", () => {
      const result = AppendBlockSchema.safeParse({
        content: "Test",
        timestamp: "2026-03-22T10:00:00.000Z",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("content validation", () => {
    it("rejects empty content", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "",
        timestamp: "2026-03-22T10:00:00.000Z",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("content");
      }
    });

    it("rejects content over 50000 chars", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "a".repeat(50001),
        timestamp: "2026-03-22T10:00:00.000Z",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("timestamp validation", () => {
    it("rejects bare date string", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "Test",
        timestamp: "2026-03-22",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("timestamp");
      }
    });

    it("rejects invalid date string", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "Test",
        timestamp: "not-a-date",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("publicKey validation", () => {
    it("rejects publicKey with non-base64url characters", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "Test",
        timestamp: "2026-03-22T10:00:00.000Z",
        publicKey: "invalid key with spaces!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("publicKey");
      }
    });

    it("rejects publicKey shorter than 43 chars", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "Test",
        timestamp: "2026-03-22T10:00:00.000Z",
        publicKey: "A".repeat(42),
      });
      expect(result.success).toBe(false);
    });

    it("accepts raw 43-char base64url publicKey", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "Test",
        timestamp: "2026-03-22T10:00:00.000Z",
        publicKey: "A".repeat(43),
        signature: "A".repeat(86),
      });
      expect(result.success).toBe(true);
    });

    it("accepts SPKI DER 59-char base64url publicKey", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "Test",
        timestamp: "2026-03-22T10:00:00.000Z",
        publicKey: "A".repeat(59),
        signature: "A".repeat(86),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("signature validation", () => {
    it("rejects signature with non-base64url characters", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "Test",
        timestamp: "2026-03-22T10:00:00.000Z",
        publicKey: "A".repeat(59),
        signature: "not+valid/base64==",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("signature");
      }
    });

    it("rejects signature not exactly 86 chars", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "Test",
        timestamp: "2026-03-22T10:00:00.000Z",
        publicKey: "A".repeat(59),
        signature: "A".repeat(85),
      });
      expect(result.success).toBe(false);
    });

    it("rejects signature of 88 chars (base64 with padding)", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "Test",
        timestamp: "2026-03-22T10:00:00.000Z",
        publicKey: "A".repeat(59),
        signature: "A".repeat(88),
      });
      expect(result.success).toBe(false);
    });

    it("accepts exactly 86-char base64url signature", () => {
      const result = AppendBlockSchema.safeParse({
        chainId: validChainId,
        content: "Test",
        timestamp: "2026-03-22T10:00:00.000Z",
        publicKey: "A".repeat(59),
        signature: "A".repeat(86),
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("CreateChainSchema — hashAlgorithm and signatureScheme enum validation", () => {
  it("rejects unsupported hashAlgorithm", () => {
    const result = CreateChainSchema.safeParse({
      purpose: "Test",
      identityType: "oauth",
      hashAlgorithm: "md5",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("hashAlgorithm");
    }
  });

  it("rejects unsupported signatureScheme", () => {
    const result = CreateChainSchema.safeParse({
      purpose: "Test",
      identityType: "oauth",
      signatureScheme: "rsa",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("signatureScheme");
    }
  });

  it("accepts sha256 hashAlgorithm explicitly", () => {
    const result = CreateChainSchema.safeParse({
      purpose: "Test",
      identityType: "oauth",
      hashAlgorithm: "sha256",
    });
    expect(result.success).toBe(true);
  });

  it("accepts ed25519 signatureScheme explicitly", () => {
    const result = CreateChainSchema.safeParse({
      purpose: "Test",
      identityType: "oauth",
      signatureScheme: "ed25519",
    });
    expect(result.success).toBe(true);
  });
});
