#!/usr/bin/env node
import { Command } from "commander";
import { CUSTODY_WARNING, appendBlock, createChain, forkChain, generateFeed, generateKeypair, inspectBlock } from "@glorychain/core";
import { FsConnector } from "@glorychain/fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
//#region src/utils/output.ts
let jsonMode = false;
function setJsonMode(enabled) {
	jsonMode = enabled;
}
function isJsonMode() {
	return jsonMode;
}
function printJson(data) {
	process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}
function printHuman(label, value) {
	if (jsonMode) printJson({ [label]: value });
	else process.stdout.write(`${label}: ${value}\n`);
}
function printError(message) {
	process.stderr.write(`Error: ${message}\n`);
}
//#endregion
//#region src/commands/append.ts
function makeAppendCommand() {
	return new Command("append").description("Append a block to an existing chain").requiredOption("--chain <chainId>", "Chain ID").requiredOption("--key <privateKey>", "Ed25519 private key (base64url)").requiredOption("--pubkey <publicKey>", "Ed25519 public key (base64url)").requiredOption("--content <text>", "Block content").option("--dir <dir>", "Chain storage directory", "./chains").option("--json", "Output as JSON").action(async (opts) => {
		if (opts.json) setJsonMode(true);
		const connector = new FsConnector(opts.dir);
		const result = appendBlock(await connector.read(opts.chain).catch((err) => {
			printError(String(err));
			process.exit(1);
		}), {
			content: opts.content,
			publicKey: opts.pubkey
		}, opts.key);
		if (!result.ok) {
			printError(result.error.message);
			process.exit(1);
		}
		await connector.write(result.value);
		const blockNumber = result.value.blocks.length - 1;
		printHuman("blockNumber", String(blockNumber));
	});
}
//#endregion
//#region src/commands/create.ts
function makeCreateCommand() {
	return new Command("create").description("Create a new chain").requiredOption("--key <privateKey>", "Ed25519 private key (base64url)").requiredOption("--pubkey <publicKey>", "Ed25519 public key (base64url)").requiredOption("--content <text>", "Genesis block content").option("--purpose <purpose>", "Chain purpose", "general").option("--creator <creatorId>", "Creator ID", "anonymous").option("--dir <dir>", "Chain storage directory", "./chains").option("--json", "Output as JSON").action(async (opts) => {
		if (opts.json) setJsonMode(true);
		const connector = new FsConnector(opts.dir);
		const result = createChain({
			content: opts.content,
			purpose: opts.purpose,
			creatorId: opts.creator,
			identityType: "anonymous",
			publicKey: opts.pubkey
		}, opts.key);
		if (!result.ok) {
			printError(result.error.message);
			process.exit(1);
		}
		await connector.write(result.value);
		printHuman("chainId", result.value.metadata.chainId);
	});
}
//#endregion
//#region src/commands/export.ts
function makeExportCommand() {
	return new Command("export").description("Export a chain as a portable offline-verifiable archive").requiredOption("--chain <chainId>", "Chain ID").option("--dir <dir>", "Chain storage directory", "./chains").option("--out <file>", "Output file path (default: stdout)").option("--json", "Output as JSON").action(async (opts) => {
		if (opts.json) setJsonMode(true);
		const chain = await new FsConnector(opts.dir).read(opts.chain).catch((err) => {
			printError(String(err));
			process.exit(1);
		});
		const archive = JSON.stringify({
			exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
			chain
		}, null, 2);
		if (opts.out) {
			await writeFile(opts.out, archive, "utf8");
			printHuman("exported", opts.out);
		} else process.stdout.write(`${archive}\n`);
	});
}
//#endregion
//#region src/commands/feed.ts
function makeFeedCommand() {
	return new Command("feed").description("Generate Atom 1.0 RSS feed for a chain").requiredOption("--chain <chainId>", "Chain ID").option("--dir <dir>", "Chain storage directory", "./chains").option("--base-url <url>", "Base URL for feed links", "https://glorychain.dev").option("--json", "Output as JSON").action(async (opts) => {
		if (opts.json) setJsonMode(true);
		const xml = generateFeed(await new FsConnector(opts.dir).read(opts.chain).catch((err) => {
			printError(String(err));
			process.exit(1);
		}), { selfUrl: opts.baseUrl });
		process.stdout.write(`${xml}\n`);
	});
}
//#endregion
//#region src/commands/fork.ts
function makeForkCommand() {
	return new Command("fork").description("Fork a chain from a specific block").requiredOption("--chain <chainId>", "Source chain ID").requiredOption("--block <n>", "Block number to fork from").requiredOption("--key <privateKey>", "Ed25519 private key (base64url)").requiredOption("--pubkey <publicKey>", "Ed25519 public key (base64url)").requiredOption("--content <text>", "Fork genesis block content").option("--purpose <purpose>", "Fork purpose", "fork").option("--creator <creatorId>", "Creator ID", "anonymous").option("--dir <dir>", "Chain storage directory", "./chains").option("--json", "Output as JSON").action(async (opts) => {
		if (opts.json) setJsonMode(true);
		const connector = new FsConnector(opts.dir);
		const result = forkChain(await connector.read(opts.chain).catch((err) => {
			printError(String(err));
			process.exit(1);
		}), Number.parseInt(opts.block, 10), {
			content: opts.content,
			purpose: opts.purpose,
			creatorId: opts.creator,
			identityType: "anonymous",
			publicKey: opts.pubkey
		}, opts.key);
		if (!result.ok) {
			printError(result.error.message);
			process.exit(1);
		}
		await connector.write(result.value);
		printHuman("chainId", result.value.metadata.chainId);
	});
}
//#endregion
//#region src/utils/config.ts
const CONFIG_DIR = ".glorychain";
const CONFIG_FILE = "config.json";
function configPath(cwd = process.cwd()) {
	return join(cwd, CONFIG_DIR, CONFIG_FILE);
}
async function writeConfig(config, cwd) {
	await mkdir(join(cwd ?? process.cwd(), CONFIG_DIR), { recursive: true });
	await writeFile(configPath(cwd), JSON.stringify(config, null, 2), "utf8");
}
//#endregion
//#region src/commands/init.ts
function makeInitCommand() {
	return new Command("init").description("Initialise a glorychain project in the current directory").option("--dir <dir>", "Chain storage directory", "chains").option("--purpose <purpose>", "Chain purpose", "general").option("--content <text>", "Genesis block content (required to create a genesis block)").option("--key <privateKey>", "Ed25519 private key (base64url) — if omitted, a new keypair is generated").option("--pubkey <publicKey>", "Ed25519 public key (base64url) — required if --key is provided").option("--json", "Output as JSON").action(async (opts) => {
		if (opts.json) setJsonMode(true);
		const chainsDir = resolve(opts.dir);
		await mkdir(chainsDir, { recursive: true });
		if (!opts.json) printHuman("created", opts.dir);
		await writeConfig({
			connector: "fs",
			chainIds: []
		});
		if (!opts.json) printHuman("config", ".glorychain/config.json");
		const charterPath = join(process.cwd(), "CHAIN_CHARTER.md");
		try {
			await writeFile(charterPath, [
				"# Chain Charter",
				"",
				"<!-- Describe the purpose and governance rules of this chain. -->",
				"",
				"## Purpose",
				"",
				"## Signatories",
				"",
				"## Governance rules",
				""
			].join("\n"), { flag: "wx" });
			if (!opts.json) printHuman("created", "CHAIN_CHARTER.md");
		} catch {}
		if (opts.content !== void 0) {
			let privateKey;
			let publicKey;
			if (opts.key !== void 0 && opts.pubkey !== void 0) {
				privateKey = opts.key;
				publicKey = opts.pubkey;
			} else {
				const kp = generateKeypair();
				if (!kp.ok) {
					printError(kp.error.message);
					process.exit(1);
				}
				privateKey = kp.value.privateKey;
				publicKey = kp.value.publicKey;
				if (!opts.json) process.stdout.write([
					"",
					"Generated keypair — save your private key, it cannot be recovered:",
					`  Public key:  ${publicKey}`,
					`  Private key: ${privateKey}`,
					""
				].join("\n"));
				else printJson({
					publicKey,
					privateKey
				});
			}
			const result = createChain({
				content: opts.content,
				purpose: opts.purpose,
				creatorId: "anonymous",
				identityType: "anonymous",
				publicKey
			}, privateKey);
			if (!result.ok) {
				printError(result.error.message);
				process.exit(1);
			}
			await new FsConnector(chainsDir).write(result.value);
			if (!opts.json) printHuman("chainId", result.value.metadata.chainId);
			else printJson({ chainId: result.value.metadata.chainId });
		}
		if (!opts.json) process.stdout.write([
			"",
			"Initialised. Next steps:",
			`  glorychain keygen`,
			`  glorychain create --key <key> --pubkey <pubkey> --content "$(cat CHAIN_CHARTER.md)"`,
			""
		].join("\n"));
	});
}
//#endregion
//#region src/commands/inspect.ts
function makeInspectCommand() {
	return new Command("inspect").description("Inspect a block's raw structure").requiredOption("--chain <chainId>", "Chain ID").requiredOption("--block <n>", "Block index").option("--dir <dir>", "Chain storage directory", "./chains").option("--json", "Output as JSON").action(async (opts) => {
		if (opts.json) setJsonMode(true);
		const chain = await new FsConnector(opts.dir).read(opts.chain).catch((err) => {
			printError(String(err));
			process.exit(1);
		});
		const blockIndex = Number.parseInt(opts.block, 10);
		const block = chain.blocks[blockIndex];
		if (block === void 0) {
			printError(`Block ${blockIndex} not found in chain ${opts.chain}`);
			process.exit(1);
		}
		const inspection = inspectBlock(block);
		if (isJsonMode()) printJson(inspection);
		else {
			printHuman("type", inspection.type);
			printHuman("blockNumber", String(inspection.block.blockNumber));
			printHuman("hash", inspection.block.hash);
			printHuman("content", inspection.block.content);
			printHuman("timestamp", inspection.block.timestamp);
		}
	});
}
//#endregion
//#region src/commands/keygen.ts
function makeKeygenCommand() {
	return new Command("keygen").description("Generate a new Ed25519 keypair").option("--json", "Output as JSON").action((opts) => {
		if (opts.json) setJsonMode(true);
		process.stderr.write(`${CUSTODY_WARNING}\n`);
		const result = generateKeypair();
		if (!result.ok) {
			process.stderr.write(`Error: ${result.error.message}\n`);
			process.exit(1);
		}
		if (isJsonMode()) printJson({
			publicKey: result.value.publicKey,
			privateKey: result.value.privateKey
		});
		else {
			printHuman("publicKey", result.value.publicKey);
			printHuman("privateKey", result.value.privateKey);
		}
	});
}
//#endregion
//#region src/commands/migrate.ts
function makeMigrateCommand() {
	return new Command("migrate").description("Migrate a chain between connectors").requiredOption("--chain <chainId>", "Chain ID").requiredOption("--from <srcDir>", "Source directory").requiredOption("--to <destDir>", "Destination directory").option("--json", "Output as JSON").action(async (opts) => {
		if (opts.json) setJsonMode(true);
		const source = new FsConnector(opts.from);
		const target = new FsConnector(opts.to);
		await source.migrate(opts.chain, target).catch((err) => {
			printError(String(err));
			process.exit(1);
		});
		printHuman("status", "migrated");
	});
}
//#endregion
//#region src/commands/template.ts
function blockStub() {
	return `# Block — ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}

## Summary

<!-- Describe what this block records. -->

## References

<!-- Links to issues, PRs, documents, or ADRs related to this block. -->

<!-- Tip: check CHAIN_CHARTER.md for the required content format for this chain. -->
<!-- Tip: use --out to save to a file, then pass the contents with --content "$(cat file)" -->
`;
}
function adrStub(title) {
	return `# ADR: ${title}

Date: ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}

## Status

Proposed

## Context

<!-- What is the situation or problem that motivates this decision? -->

## Decision

<!-- What was decided? -->

## Consequences

<!-- What becomes easier or harder as a result of this decision? -->

## Chain Reference

<!-- Fill in after appending to chain: -->
Block appended to chain: <chain-id>, block number: <n>
`;
}
function makeTemplateCommand() {
	return new Command("template").description("Generate a block or ADR content stub").requiredOption("--type <type>", "Template type: block or adr").option("--title <title>", "ADR title (required for --type adr)").option("--out <file>", "Write output to file instead of stdout").option("--json", "Output as JSON").action(async (opts) => {
		if (opts.json) setJsonMode(true);
		const validTypes = ["block", "adr"];
		if (!validTypes.includes(opts.type)) {
			printError(`--type must be one of: ${validTypes.join(", ")}`);
			process.exit(1);
		}
		if (opts.type === "adr" && !opts.title) {
			printError("--title is required for ADR templates");
			process.exit(1);
		}
		const content = opts.type === "block" ? blockStub() : adrStub(opts.title);
		if (opts.out) {
			await writeFile(opts.out, content, "utf8");
			if (!opts.json) process.stdout.write(`written: ${opts.out}\n`);
		} else if (opts.json) printJson({
			type: opts.type,
			content
		});
		else process.stdout.write(content);
	});
}
//#endregion
//#region src/commands/verify.ts
function makeVerifyCommand() {
	return new Command("verify").description("Verify chain integrity").requiredOption("--chain <chainId>", "Chain ID").option("--dir <dir>", "Chain storage directory", "./chains").option("--json", "Output as JSON").action(async (opts) => {
		if (opts.json) setJsonMode(true);
		const result = await new FsConnector(opts.dir).verify(opts.chain).catch((err) => {
			printError(String(err));
			process.exit(1);
		});
		if (isJsonMode()) printJson(result);
		else {
			printHuman("valid", String(result.valid));
			for (const e of result.errors) printError(e);
		}
		if (!result.valid) process.exit(1);
	});
}
//#endregion
//#region src/index.ts
const program = new Command();
program.name("glorychain").description("Create, verify, and manage Glory Chain audit chains").version("0.0.1");
program.addCommand(makeCreateCommand());
program.addCommand(makeAppendCommand());
program.addCommand(makeVerifyCommand());
program.addCommand(makeForkCommand());
program.addCommand(makeMigrateCommand());
program.addCommand(makeFeedCommand());
program.addCommand(makeKeygenCommand());
program.addCommand(makeInspectCommand());
program.addCommand(makeExportCommand());
program.addCommand(makeInitCommand());
program.addCommand(makeTemplateCommand());
program.parse();
//#endregion
export {};

//# sourceMappingURL=index.mjs.map