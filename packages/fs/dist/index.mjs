import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { migrateChain, verifyChain } from "@glorychain/core";
//#region src/connector.ts
function isEnoent(err) {
	return typeof err === "object" && err !== null && "code" in err && err.code === "ENOENT";
}
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
var FsConnector = class {
	version = "0.0.1";
	pollIntervalMs;
	constructor(dir, options = {}) {
		this.dir = dir;
		this.pollIntervalMs = options.pollIntervalMs ?? 2e3;
	}
	async read(chainId) {
		const raw = await readFile(join(this.dir, `${chainId}.json`), "utf8");
		return JSON.parse(raw);
	}
	async write(chain) {
		await mkdir(this.dir, { recursive: true });
		await writeFile(join(this.dir, `${chain.metadata.chainId}.json`), JSON.stringify(chain, null, 2), "utf8");
	}
	async *watch(chainId) {
		const filePath = join(this.dir, `${chainId}.json`);
		let lastHash = null;
		while (true) {
			try {
				const contents = await readFile(filePath, "utf8");
				const currentHash = createHash("sha256").update(contents).digest("hex");
				if (lastHash === null) lastHash = currentHash;
				else if (currentHash !== lastHash) {
					lastHash = currentHash;
					yield {
						type: "FILE_MODIFIED",
						chainId,
						timestamp: (/* @__PURE__ */ new Date()).toISOString(),
						detail: filePath
					};
				}
			} catch (err) {
				if (isEnoent(err)) {
					yield {
						type: "FILE_MISSING",
						chainId,
						timestamp: (/* @__PURE__ */ new Date()).toISOString(),
						detail: `Chain file not found: ${filePath}`
					};
					lastHash = null;
				} else yield {
					type: "UNEXPECTED_ERROR",
					chainId,
					timestamp: (/* @__PURE__ */ new Date()).toISOString(),
					detail: String(err)
				};
			}
			await sleep(this.pollIntervalMs);
		}
	}
	async migrate(chainId, target) {
		const updated = migrateChain(await this.read(chainId), "fs", target.version);
		await target.write(updated);
	}
	async verify(chainId) {
		return verifyChain(await this.read(chainId));
	}
};
//#endregion
export { FsConnector };

//# sourceMappingURL=index.mjs.map