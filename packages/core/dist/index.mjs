import { createRequire } from "node:module";
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID, sign, verify } from "node:crypto";
//#region \0rolldown/runtime.js
var __require = /* @__PURE__ */ createRequire(import.meta.url);
//#endregion
//#region src/block/canonical.ts
function genesisCanonical(block) {
	return JSON.stringify({
		blockNumber: block.blockNumber,
		chainId: block.chainId,
		content: block.content,
		timestamp: block.timestamp,
		previousHash: block.previousHash,
		protocolVersion: block.protocolVersion,
		creatorId: block.creatorId,
		purpose: block.purpose,
		identityType: block.identityType,
		hashAlgorithm: block.hashAlgorithm,
		signatureScheme: block.signatureScheme,
		contentSchema: block.contentSchema ?? null
	});
}
function blockCanonical(block) {
	return JSON.stringify({
		blockNumber: block.blockNumber,
		chainId: block.chainId,
		content: block.content,
		timestamp: block.timestamp,
		previousHash: block.previousHash,
		protocolVersion: block.protocolVersion
	});
}
//#endregion
//#region src/schema/errors.ts
const ErrorCode = {
	INVALID_SIGNATURE: "INVALID_SIGNATURE",
	BROKEN_CHAIN: "BROKEN_CHAIN",
	REPLAY_DETECTED: "REPLAY_DETECTED",
	ALGORITHM_UNSUPPORTED: "ALGORITHM_UNSUPPORTED",
	CHAIN_NOT_FOUND: "CHAIN_NOT_FOUND",
	KEY_MISMATCH: "KEY_MISMATCH",
	FUTURE_TIMESTAMP: "FUTURE_TIMESTAMP",
	DUPLICATE_BLOCK: "DUPLICATE_BLOCK",
	SCHEMA_VIOLATION: "SCHEMA_VIOLATION"
};
//#endregion
//#region src/crypto/hash.ts
const SUPPORTED_HASH_ALGORITHMS = new Set(["sha256"]);
function hashBlock(payload, algorithm = "sha256") {
	const algo = algorithm.toLowerCase();
	if (!SUPPORTED_HASH_ALGORITHMS.has(algo)) return {
		ok: false,
		error: {
			code: ErrorCode.ALGORITHM_UNSUPPORTED,
			message: `Unsupported hash algorithm: ${algorithm}`
		}
	};
	return {
		ok: true,
		value: createHash(algo).update(payload, "utf8").digest("hex")
	};
}
//#endregion
//#region src/block/inspect.ts
function isGenesisBlock(block) {
	return block.blockNumber === 0;
}
function inspectBlock(block) {
	if (isGenesisBlock(block)) return {
		type: "genesis",
		block
	};
	return {
		type: "block",
		block
	};
}
function computeBlockHash(block, algorithm) {
	return hashBlock(isGenesisBlock(block) ? genesisCanonical(block) : blockCanonical(block), algorithm);
}
//#endregion
//#region src/crypto/sign.ts
const SUPPORTED_SIGNATURE_SCHEMES = new Set(["ed25519"]);
function signBlock(payload, privateKeyBase64url, scheme = "ed25519") {
	const s = scheme.toLowerCase();
	if (!SUPPORTED_SIGNATURE_SCHEMES.has(s)) return {
		ok: false,
		error: {
			code: ErrorCode.ALGORITHM_UNSUPPORTED,
			message: `Unsupported signature scheme: ${scheme}`
		}
	};
	const privateKey = createPrivateKey({
		key: Buffer.from(privateKeyBase64url, "base64url"),
		format: "der",
		type: "pkcs8"
	});
	return {
		ok: true,
		value: sign(null, Buffer.from(payload, "utf8"), privateKey).toString("base64url")
	};
}
function verifyBlock(payload, signatureBase64url, publicKeyBase64url, scheme = "ed25519") {
	const s = scheme.toLowerCase();
	if (!SUPPORTED_SIGNATURE_SCHEMES.has(s)) return {
		ok: false,
		error: {
			code: ErrorCode.ALGORITHM_UNSUPPORTED,
			message: `Unsupported signature scheme: ${scheme}`
		}
	};
	const publicKey = createPublicKey({
		key: Buffer.from(publicKeyBase64url, "base64url"),
		format: "der",
		type: "spki"
	});
	const sigBuffer = Buffer.from(signatureBase64url, "base64url");
	return {
		ok: true,
		value: verify(null, Buffer.from(payload, "utf8"), publicKey, sigBuffer)
	};
}
//#endregion
//#region src/chain/create.ts
const PROTOCOL_VERSION = "0.0.1";
function createChain(input, privateKey) {
	const { content, purpose, creatorId, identityType, publicKey, hashAlgorithm = "sha256", signatureScheme = "ed25519", contentSchema } = input;
	const chainId = randomUUID();
	const timestamp = (/* @__PURE__ */ new Date()).toISOString();
	const protocolVersion = PROTOCOL_VERSION;
	const canonical = JSON.stringify({
		blockNumber: 0,
		chainId,
		content,
		timestamp,
		previousHash: null,
		protocolVersion,
		creatorId,
		purpose,
		identityType,
		hashAlgorithm,
		signatureScheme,
		contentSchema: contentSchema ?? null
	});
	const hashResult = hashBlock(canonical, hashAlgorithm);
	if (!hashResult.ok) return hashResult;
	const signResult = signBlock(canonical, privateKey, signatureScheme);
	if (!signResult.ok) return signResult;
	const genesisBlock = {
		blockNumber: 0,
		chainId,
		content,
		timestamp,
		previousHash: null,
		hash: hashResult.value,
		signature: signResult.value,
		publicKey,
		protocolVersion,
		creatorId,
		purpose,
		identityType,
		hashAlgorithm,
		signatureScheme,
		...contentSchema !== void 0 ? { contentSchema } : {}
	};
	return {
		ok: true,
		value: {
			metadata: {
				chainId,
				createdAt: timestamp,
				protocolVersion,
				hashAlgorithm,
				signatureScheme,
				migrationHistory: [],
				knownForks: [],
				transferHistory: []
			},
			blocks: [genesisBlock]
		}
	};
}
//#endregion
//#region src/chain/append.ts
function appendBlock(chain, input, privateKey, options) {
	const { content, publicKey } = input;
	const lastBlock = chain.blocks[chain.blocks.length - 1];
	if (lastBlock === void 0) return {
		ok: false,
		error: {
			code: ErrorCode.BROKEN_CHAIN,
			message: "Chain has no blocks"
		}
	};
	const genesis = chain.blocks[0];
	if (genesis !== void 0 && isGenesisBlock(genesis) && genesis.contentSchema !== void 0 && options?.validateContent !== void 0) {
		const validationResult = options.validateContent(content, genesis.contentSchema);
		if (!validationResult.valid) return {
			ok: false,
			error: {
				code: ErrorCode.SCHEMA_VIOLATION,
				message: "Block content failed genesis schema validation",
				blockNumber: chain.blocks.length,
				schemaErrors: validationResult.errors
			}
		};
	}
	const blockNumber = chain.blocks.length;
	const chainId = chain.metadata.chainId;
	const previousHash = lastBlock.hash;
	const timestamp = (/* @__PURE__ */ new Date()).toISOString();
	const protocolVersion = PROTOCOL_VERSION;
	const { hashAlgorithm, signatureScheme } = chain.metadata;
	const canonical = JSON.stringify({
		blockNumber,
		chainId,
		content,
		timestamp,
		previousHash,
		protocolVersion
	});
	const hashResult = hashBlock(canonical, hashAlgorithm);
	if (!hashResult.ok) return hashResult;
	const signResult = signBlock(canonical, privateKey, signatureScheme);
	if (!signResult.ok) return signResult;
	const newBlock = {
		blockNumber,
		chainId,
		content,
		timestamp,
		previousHash,
		hash: hashResult.value,
		signature: signResult.value,
		publicKey,
		protocolVersion
	};
	const newBlocks = [...chain.blocks, newBlock];
	return {
		ok: true,
		value: {
			...chain,
			blocks: newBlocks
		}
	};
}
//#endregion
//#region src/chain/fork.ts
function forkChain(sourceChain, forkFromBlockNumber, input, privateKey) {
	const sourceBlock = sourceChain.blocks[forkFromBlockNumber];
	if (sourceBlock === void 0) return {
		ok: false,
		error: {
			code: ErrorCode.CHAIN_NOT_FOUND,
			message: `Block ${forkFromBlockNumber} not found in source chain`,
			blockNumber: forkFromBlockNumber
		}
	};
	const { content, purpose, creatorId, identityType, publicKey, hashAlgorithm = sourceChain.metadata.hashAlgorithm, signatureScheme = sourceChain.metadata.signatureScheme, forkReason } = input;
	const chainId = randomUUID();
	const timestamp = (/* @__PURE__ */ new Date()).toISOString();
	const protocolVersion = PROTOCOL_VERSION;
	const forkSourceBlockHash = sourceBlock.hash;
	const canonical = JSON.stringify({
		blockNumber: 0,
		chainId,
		content,
		timestamp,
		previousHash: null,
		protocolVersion,
		creatorId,
		purpose,
		identityType,
		hashAlgorithm,
		signatureScheme
	});
	const hashResult = hashBlock(canonical, hashAlgorithm);
	if (!hashResult.ok) return hashResult;
	const signResult = signBlock(canonical, privateKey, signatureScheme);
	if (!signResult.ok) return signResult;
	const forkGenesisBlock = {
		blockNumber: 0,
		chainId,
		content,
		timestamp,
		previousHash: null,
		hash: hashResult.value,
		signature: signResult.value,
		publicKey,
		protocolVersion,
		creatorId,
		purpose,
		identityType,
		hashAlgorithm,
		signatureScheme,
		forkOf: sourceChain.metadata.chainId,
		forkFromBlock: forkFromBlockNumber,
		forkSourceBlockHash,
		...forkReason !== void 0 && { forkReason }
	};
	return {
		ok: true,
		value: {
			metadata: {
				chainId,
				createdAt: timestamp,
				protocolVersion,
				hashAlgorithm,
				signatureScheme,
				migrationHistory: [],
				knownForks: [],
				transferHistory: []
			},
			blocks: [forkGenesisBlock]
		}
	};
}
function recordForkOnSource(sourceChain, forkChainId, forkFromBlock, forkSourceBlockHash) {
	const ref = {
		forkChainId,
		forkFromBlock,
		forkSourceBlockHash,
		createdAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	return {
		...sourceChain,
		metadata: {
			...sourceChain.metadata,
			knownForks: [...sourceChain.metadata.knownForks, ref]
		}
	};
}
//#endregion
//#region src/chain/migrate.ts
function migrateChain(chain, fromConnector, toConnector, reason) {
	const event = {
		fromConnector,
		toConnector,
		timestamp: (/* @__PURE__ */ new Date()).toISOString(),
		...reason !== void 0 && { reason }
	};
	return {
		...chain,
		metadata: {
			...chain.metadata,
			migrationHistory: [...chain.metadata.migrationHistory, event]
		}
	};
}
//#endregion
//#region src/crypto/keygen.ts
const SUPPORTED_SCHEMES = new Set(["ed25519"]);
const CUSTODY_WARNING = `WARNING: Private key material is about to be displayed.
Store this key securely — it cannot be recovered if lost.
Anyone with access to this key can forge blocks on your chain.
Do NOT share, commit to version control, or paste into a chat.`;
function generateKeypair(scheme = "ed25519") {
	const s = scheme.toLowerCase();
	if (!SUPPORTED_SCHEMES.has(s)) return {
		ok: false,
		error: {
			code: ErrorCode.ALGORITHM_UNSUPPORTED,
			message: `Unsupported signature scheme: ${scheme}`
		}
	};
	const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
		publicKeyEncoding: {
			type: "spki",
			format: "der"
		},
		privateKeyEncoding: {
			type: "pkcs8",
			format: "der"
		}
	});
	return {
		ok: true,
		value: {
			publicKey: publicKey.toString("base64url"),
			privateKey: privateKey.toString("base64url")
		}
	};
}
//#endregion
//#region src/feed/generateFeed.ts
function escapeXml(s) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function generateFeed(chain, options) {
	const { metadata, blocks } = chain;
	const genesis = blocks[0];
	const updated = blocks[blocks.length - 1]?.timestamp ?? genesis.timestamp;
	const selfLink = options?.selfUrl !== void 0 ? `  <link rel="self" href="${escapeXml(options.selfUrl)}"/>\n` : "";
	const entries = [...blocks].reverse().map((block) => `  <entry>
    <id>urn:glorychain:${metadata.chainId}:block:${block.blockNumber}</id>
    <title>Block ${block.blockNumber}</title>
    <updated>${block.timestamp}</updated>
    <content type="text">${escapeXml(block.content)}</content>
    <glorychain:hash xmlns:glorychain="https://glorychain.dev/ns">${block.hash}</glorychain:hash>
  </entry>`).join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>urn:glorychain:${metadata.chainId}</id>
  <title>${escapeXml(genesis.purpose)}</title>
  <updated>${updated}</updated>
  <author><name>${escapeXml(genesis.creatorId)}</name></author>
${selfLink}  <generator>glorychain ${PROTOCOL_VERSION}</generator>
${entries}
</feed>`;
}
//#endregion
//#region src/validate/ajv.ts
function createAjvValidator() {
	let ajvInstance;
	const compiledSchemas = /* @__PURE__ */ new WeakMap();
	function getAjv() {
		if (ajvInstance !== void 0) return ajvInstance;
		const AjvCtor = __require("ajv");
		ajvInstance = new (typeof AjvCtor === "function" ? AjvCtor : AjvCtor.default)({
			allErrors: true,
			strict: false
		});
		return ajvInstance;
	}
	return (content, schema) => {
		let parsed;
		try {
			parsed = JSON.parse(content);
		} catch {
			return {
				valid: false,
				errors: [{
					path: "/",
					message: "block content is not valid JSON"
				}]
			};
		}
		const ajv = getAjv();
		let validate = compiledSchemas.get(schema);
		if (validate === void 0) {
			validate = ajv.compile(schema);
			compiledSchemas.set(schema, validate);
		}
		if (validate(parsed)) return { valid: true };
		return {
			valid: false,
			errors: (validate.errors ?? []).map((e) => ({
				path: e.instancePath || "/",
				message: e.message ?? "validation failed"
			}))
		};
	};
}
//#endregion
//#region src/verify/verifyBlock.ts
const FUTURE_TIMESTAMP_TOLERANCE_MS$1 = 300 * 1e3;
function verifySingleBlock(block, hashAlgorithm, signatureScheme) {
	const errors = [];
	const hashResult = computeBlockHash(block, hashAlgorithm);
	if (!hashResult.ok) errors.push({
		code: hashResult.error.code,
		blockNumber: block.blockNumber,
		message: hashResult.error.message
	});
	else if (hashResult.value !== block.hash) errors.push({
		code: ErrorCode.BROKEN_CHAIN,
		blockNumber: block.blockNumber,
		message: `Block ${block.blockNumber} hash mismatch — content may have been tampered with`
	});
	const sigResult = verifyBlock(isGenesisBlock(block) ? genesisCanonical(block) : blockCanonical(block), block.signature, block.publicKey, signatureScheme);
	if (!sigResult.ok) errors.push({
		code: sigResult.error.code,
		blockNumber: block.blockNumber,
		message: sigResult.error.message
	});
	else if (!sigResult.value) errors.push({
		code: ErrorCode.INVALID_SIGNATURE,
		blockNumber: block.blockNumber,
		message: `Block ${block.blockNumber} signature is invalid`
	});
	if (new Date(block.timestamp).getTime() > Date.now() + FUTURE_TIMESTAMP_TOLERANCE_MS$1) errors.push({
		code: ErrorCode.FUTURE_TIMESTAMP,
		blockNumber: block.blockNumber,
		message: `Block ${block.blockNumber} timestamp is too far in the future`
	});
	return {
		valid: errors.length === 0,
		errors,
		blockCount: 1,
		lastVerifiedBlock: errors.length === 0 ? 0 : -1
	};
}
//#endregion
//#region src/verify/verifyChain.ts
const FUTURE_TIMESTAMP_TOLERANCE_MS = 300 * 1e3;
function verifyChain(chain, options) {
	const { blocks, metadata } = chain;
	const { hashAlgorithm, signatureScheme, chainId } = metadata;
	const allErrors = [];
	let lastVerifiedBlock = -1;
	const seenBlockNumbers = /* @__PURE__ */ new Set();
	const genesis = blocks[0];
	const contentSchema = genesis !== void 0 && isGenesisBlock(genesis) ? genesis.contentSchema : void 0;
	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i];
		if (block === void 0) continue;
		const errorsBeforeThisBlock = allErrors.length;
		if (seenBlockNumbers.has(block.blockNumber)) allErrors.push({
			code: ErrorCode.DUPLICATE_BLOCK,
			blockNumber: block.blockNumber,
			message: `Duplicate block number ${block.blockNumber}`
		});
		seenBlockNumbers.add(block.blockNumber);
		if (block.chainId !== chainId) allErrors.push({
			code: ErrorCode.BROKEN_CHAIN,
			blockNumber: block.blockNumber,
			message: `Block ${block.blockNumber} chainId mismatch: expected ${chainId}, got ${block.chainId}`
		});
		if (i === 0) {
			if (!isGenesisBlock(block) || block.previousHash !== null) allErrors.push({
				code: ErrorCode.BROKEN_CHAIN,
				blockNumber: 0,
				message: "First block must be a genesis block with previousHash null"
			});
		}
		if (i > 0) {
			const prevBlock = blocks[i - 1];
			if (prevBlock !== void 0 && block.previousHash !== prevBlock.hash) allErrors.push({
				code: ErrorCode.BROKEN_CHAIN,
				blockNumber: block.blockNumber,
				message: `Block ${block.blockNumber} previousHash does not match block ${block.blockNumber - 1} hash`
			});
		}
		const hashResult = computeBlockHash(block, hashAlgorithm);
		if (!hashResult.ok) allErrors.push({
			code: hashResult.error.code,
			blockNumber: block.blockNumber,
			message: hashResult.error.message
		});
		else if (hashResult.value !== block.hash) allErrors.push({
			code: ErrorCode.BROKEN_CHAIN,
			blockNumber: block.blockNumber,
			message: `Block ${block.blockNumber} hash mismatch — content may have been tampered with`
		});
		const sigResult = verifyBlock(isGenesisBlock(block) ? genesisCanonical(block) : blockCanonical(block), block.signature, block.publicKey, signatureScheme);
		if (!sigResult.ok) allErrors.push({
			code: sigResult.error.code,
			blockNumber: block.blockNumber,
			message: sigResult.error.message
		});
		else if (!sigResult.value) allErrors.push({
			code: ErrorCode.INVALID_SIGNATURE,
			blockNumber: block.blockNumber,
			message: `Block ${block.blockNumber} signature is invalid`
		});
		if (new Date(block.timestamp).getTime() > Date.now() + FUTURE_TIMESTAMP_TOLERANCE_MS) allErrors.push({
			code: ErrorCode.FUTURE_TIMESTAMP,
			blockNumber: block.blockNumber,
			message: `Block ${block.blockNumber} timestamp is too far in the future`
		});
		if (i > 0 && contentSchema !== void 0 && options?.validateContent !== void 0) {
			const validationResult = options.validateContent(block.content, contentSchema);
			if (!validationResult.valid) allErrors.push({
				code: ErrorCode.SCHEMA_VIOLATION,
				blockNumber: block.blockNumber,
				message: `Block ${block.blockNumber} content failed genesis schema validation`,
				schemaErrors: validationResult.errors
			});
		}
		if (allErrors.length === errorsBeforeThisBlock) lastVerifiedBlock = i;
	}
	return {
		valid: allErrors.length === 0,
		errors: allErrors,
		blockCount: blocks.length,
		lastVerifiedBlock
	};
}
//#endregion
export { CUSTODY_WARNING, ErrorCode, PROTOCOL_VERSION, appendBlock, blockCanonical, computeBlockHash, createAjvValidator, createChain, forkChain, generateFeed, generateKeypair, genesisCanonical, hashBlock, inspectBlock, isGenesisBlock, migrateChain, recordForkOnSource, signBlock, verifyBlock, verifyChain, verifySingleBlock };

//# sourceMappingURL=index.mjs.map