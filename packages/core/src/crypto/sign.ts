import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import type { GloryChainError, Result } from "../schema/errors.js";
import { ErrorCode } from "../schema/errors.js";

const SUPPORTED_SIGNATURE_SCHEMES = new Set(["ed25519"]);

export function signBlock(
  payload: string,
  privateKeyBase64url: string,
  scheme = "ed25519",
): Result<string, GloryChainError> {
  const s = scheme.toLowerCase();
  if (!SUPPORTED_SIGNATURE_SCHEMES.has(s)) {
    return {
      ok: false,
      error: {
        code: ErrorCode.ALGORITHM_UNSUPPORTED,
        message: `Unsupported signature scheme: ${scheme}`,
      },
    };
  }
  const keyBuffer = Buffer.from(privateKeyBase64url, "base64url");
  const privateKey = createPrivateKey({
    key: keyBuffer,
    format: "der",
    type: "pkcs8",
  });
  const signature = sign(null, Buffer.from(payload, "utf8"), privateKey);
  return { ok: true, value: signature.toString("base64url") };
}

export function verifyBlock(
  payload: string,
  signatureBase64url: string,
  publicKeyBase64url: string,
  scheme = "ed25519",
): Result<boolean, GloryChainError> {
  const s = scheme.toLowerCase();
  if (!SUPPORTED_SIGNATURE_SCHEMES.has(s)) {
    return {
      ok: false,
      error: {
        code: ErrorCode.ALGORITHM_UNSUPPORTED,
        message: `Unsupported signature scheme: ${scheme}`,
      },
    };
  }
  const keyBuffer = Buffer.from(publicKeyBase64url, "base64url");
  const publicKey = createPublicKey({
    key: keyBuffer,
    format: "der",
    type: "spki",
  });
  const sigBuffer = Buffer.from(signatureBase64url, "base64url");
  const isValid = verify(null, Buffer.from(payload, "utf8"), publicKey, sigBuffer);
  return { ok: true, value: isValid };
}
