import { generateKeyPairSync } from "node:crypto";
import type { GloryChainError, Result } from "../schema/errors.js";
import { ErrorCode } from "../schema/errors.js";

const SUPPORTED_SCHEMES = new Set(["ed25519"]);

// FR7: Mandatory custody warning — displayed by callers (CLI) before any key output.
// This function is pure — it does NOT print or log. The CLI layer must display this.
export const CUSTODY_WARNING = `WARNING: Private key material is about to be displayed.
Store this key securely — it cannot be recovered if lost.
Anyone with access to this key can forge blocks on your chain.
Do NOT share, commit to version control, or paste into a chat.`;

export function generateKeypair(
  scheme = "ed25519",
): Result<{ publicKey: string; privateKey: string }, GloryChainError> {
  const s = scheme.toLowerCase();
  if (!SUPPORTED_SCHEMES.has(s)) {
    return {
      ok: false,
      error: {
        code: ErrorCode.ALGORITHM_UNSUPPORTED,
        message: `Unsupported signature scheme: ${scheme}`,
      },
    };
  }
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });
  return {
    ok: true,
    value: {
      publicKey: (publicKey as Buffer).toString("base64url"),
      privateKey: (privateKey as Buffer).toString("base64url"),
    },
  };
}
