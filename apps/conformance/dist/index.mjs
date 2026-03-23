import { Command } from "commander";
import { appendBlock, createChain, forkChain, generateKeypair, verifyChain } from "@glorychain/core";
//#region src/runner.ts
async function runSuites(suites, options = {}) {
	const results = [];
	for (const suite of suites) {
		const result = await suite.run().catch((err) => ({
			passed: false,
			name: suite.name,
			error: String(err)
		}));
		results.push(result);
	}
	if (options.json) {
		process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
		return;
	}
	process.stdout.write(`TAP version 14\n`);
	process.stdout.write(`1..${results.length}\n`);
	let i = 1;
	for (const r of results) {
		const status = r.passed ? "ok" : "not ok";
		process.stdout.write(`${status} ${i} - ${r.name}\n`);
		if (!r.passed && r.error) process.stdout.write(`  # Error: ${r.error}\n`);
		i++;
	}
	if (results.filter((r) => !r.passed).length > 0) process.exit(1);
}
//#endregion
//#region src/suites/append.ts
const appendSuites = [
	{
		name: "append: second block has blockNumber 1",
		run: async () => {
			const kp = generateKeypair();
			if (!kp.ok) return {
				passed: false,
				name: "append: second block has blockNumber 1",
				error: "keygen failed"
			};
			const chain = createChain({
				content: "genesis",
				purpose: "test",
				creatorId: "tester",
				identityType: "anonymous",
				publicKey: kp.value.publicKey
			}, kp.value.privateKey);
			if (!chain.ok) return {
				passed: false,
				name: "append: second block has blockNumber 1",
				error: chain.error.message
			};
			const appended = appendBlock(chain.value, {
				content: "block 1",
				publicKey: kp.value.publicKey
			}, kp.value.privateKey);
			if (!appended.ok) return {
				passed: false,
				name: "append: second block has blockNumber 1",
				error: appended.error.message
			};
			return {
				passed: appended.value.blocks[1]?.blockNumber === 1,
				name: "append: second block has blockNumber 1"
			};
		}
	},
	{
		name: "append: previousHash matches genesis hash",
		run: async () => {
			const kp = generateKeypair();
			if (!kp.ok) return {
				passed: false,
				name: "append: previousHash matches genesis hash",
				error: "keygen failed"
			};
			const chain = createChain({
				content: "genesis",
				purpose: "test",
				creatorId: "tester",
				identityType: "anonymous",
				publicKey: kp.value.publicKey
			}, kp.value.privateKey);
			if (!chain.ok) return {
				passed: false,
				name: "append: previousHash matches genesis hash",
				error: chain.error.message
			};
			const appended = appendBlock(chain.value, {
				content: "block 1",
				publicKey: kp.value.publicKey
			}, kp.value.privateKey);
			if (!appended.ok) return {
				passed: false,
				name: "append: previousHash matches genesis hash",
				error: appended.error.message
			};
			const genesisHash = appended.value.blocks[0]?.hash;
			const prevHash = appended.value.blocks[1]?.previousHash;
			const passed = genesisHash === prevHash;
			return {
				passed,
				name: "append: previousHash matches genesis hash",
				...passed ? {} : { error: `genesis=${genesisHash}, prev=${prevHash}` }
			};
		}
	},
	{
		name: "append: multi-block chain verifies as valid",
		run: async () => {
			const kp = generateKeypair();
			if (!kp.ok) return {
				passed: false,
				name: "append: multi-block chain verifies as valid",
				error: "keygen failed"
			};
			const chain = createChain({
				content: "genesis",
				purpose: "test",
				creatorId: "tester",
				identityType: "anonymous",
				publicKey: kp.value.publicKey
			}, kp.value.privateKey);
			if (!chain.ok) return {
				passed: false,
				name: "append: multi-block chain verifies as valid",
				error: chain.error.message
			};
			const appended = appendBlock(chain.value, {
				content: "block 1",
				publicKey: kp.value.publicKey
			}, kp.value.privateKey);
			if (!appended.ok) return {
				passed: false,
				name: "append: multi-block chain verifies as valid",
				error: appended.error.message
			};
			const verification = verifyChain(appended.value);
			return {
				passed: verification.valid,
				name: "append: multi-block chain verifies as valid",
				...verification.valid ? {} : { error: verification.errors.join(", ") }
			};
		}
	}
];
//#endregion
//#region src/suites/fork.ts
const forkSuites = [{
	name: "fork: forked chain has blockNumber 0",
	run: async () => {
		const kp = generateKeypair();
		if (!kp.ok) return {
			passed: false,
			name: "fork: forked chain has blockNumber 0",
			error: "keygen failed"
		};
		const source = createChain({
			content: "source",
			purpose: "test",
			creatorId: "tester",
			identityType: "anonymous",
			publicKey: kp.value.publicKey
		}, kp.value.privateKey);
		if (!source.ok) return {
			passed: false,
			name: "fork: forked chain has blockNumber 0",
			error: source.error.message
		};
		const forked = forkChain(source.value, 0, {
			content: "fork",
			purpose: "fork-test",
			creatorId: "tester",
			identityType: "anonymous",
			publicKey: kp.value.publicKey
		}, kp.value.privateKey);
		if (!forked.ok) return {
			passed: false,
			name: "fork: forked chain has blockNumber 0",
			error: forked.error.message
		};
		return {
			passed: forked.value.blocks[0]?.blockNumber === 0,
			name: "fork: forked chain has blockNumber 0"
		};
	}
}, {
	name: "fork: forked chain has different chainId than source",
	run: async () => {
		const kp = generateKeypair();
		if (!kp.ok) return {
			passed: false,
			name: "fork: forked chain has different chainId than source",
			error: "keygen failed"
		};
		const source = createChain({
			content: "source",
			purpose: "test",
			creatorId: "tester",
			identityType: "anonymous",
			publicKey: kp.value.publicKey
		}, kp.value.privateKey);
		if (!source.ok) return {
			passed: false,
			name: "fork: forked chain has different chainId than source",
			error: source.error.message
		};
		const forked = forkChain(source.value, 0, {
			content: "fork",
			purpose: "fork-test",
			creatorId: "tester",
			identityType: "anonymous",
			publicKey: kp.value.publicKey
		}, kp.value.privateKey);
		if (!forked.ok) return {
			passed: false,
			name: "fork: forked chain has different chainId than source",
			error: forked.error.message
		};
		return {
			passed: forked.value.metadata.chainId !== source.value.metadata.chainId,
			name: "fork: forked chain has different chainId than source"
		};
	}
}];
//#endregion
//#region src/suites/genesis.ts
function makeInput(kp) {
	return {
		content: "genesis conformance test",
		purpose: "conformance",
		creatorId: "conformance-runner",
		identityType: "anonymous",
		publicKey: kp.publicKey
	};
}
const genesisSuites = [
	{
		name: "genesis: blockNumber is 0",
		run: async () => {
			const kp = generateKeypair();
			if (!kp.ok) return {
				passed: false,
				name: "genesis: blockNumber is 0",
				error: "keygen failed"
			};
			const result = createChain(makeInput(kp.value), kp.value.privateKey);
			if (!result.ok) return {
				passed: false,
				name: "genesis: blockNumber is 0",
				error: result.error.message
			};
			return {
				passed: result.value.blocks[0]?.blockNumber === 0,
				name: "genesis: blockNumber is 0"
			};
		}
	},
	{
		name: "genesis: chain verifies as valid",
		run: async () => {
			const kp = generateKeypair();
			if (!kp.ok) return {
				passed: false,
				name: "genesis: chain verifies as valid",
				error: "keygen failed"
			};
			const result = createChain(makeInput(kp.value), kp.value.privateKey);
			if (!result.ok) return {
				passed: false,
				name: "genesis: chain verifies as valid",
				error: result.error.message
			};
			const verification = verifyChain(result.value);
			return {
				passed: verification.valid,
				name: "genesis: chain verifies as valid",
				...verification.valid ? {} : { error: verification.errors.join(", ") }
			};
		}
	},
	{
		name: "genesis: has chainId and protocolVersion",
		run: async () => {
			const kp = generateKeypair();
			if (!kp.ok) return {
				passed: false,
				name: "genesis: has chainId and protocolVersion",
				error: "keygen failed"
			};
			const result = createChain(makeInput(kp.value), kp.value.privateKey);
			if (!result.ok) return {
				passed: false,
				name: "genesis: has chainId and protocolVersion",
				error: result.error.message
			};
			const { metadata } = result.value;
			return {
				passed: typeof metadata.chainId === "string" && metadata.chainId.length > 0 && typeof metadata.protocolVersion === "string",
				name: "genesis: has chainId and protocolVersion"
			};
		}
	}
];
//#endregion
//#region src/suites/replay.ts
const replaySuites = [{
	name: "replay: block from chain A injected into chain B fails verification (FR12)",
	run: async () => {
		const name = "replay: block from chain A injected into chain B fails verification (FR12)";
		const kp = generateKeypair();
		if (!kp.ok) return {
			passed: false,
			name,
			error: "keygen failed"
		};
		const chainA = createChain({
			content: "chain A genesis",
			purpose: "test",
			creatorId: "tester",
			identityType: "anonymous",
			publicKey: kp.value.publicKey
		}, kp.value.privateKey);
		if (!chainA.ok) return {
			passed: false,
			name,
			error: chainA.error.message
		};
		const chainAWith2 = appendBlock(chainA.value, {
			content: "chain A block 1",
			publicKey: kp.value.publicKey
		}, kp.value.privateKey);
		if (!chainAWith2.ok) return {
			passed: false,
			name,
			error: chainAWith2.error.message
		};
		const chainB = createChain({
			content: "chain B genesis",
			purpose: "test",
			creatorId: "tester",
			identityType: "anonymous",
			publicKey: kp.value.publicKey
		}, kp.value.privateKey);
		if (!chainB.ok) return {
			passed: false,
			name,
			error: chainB.error.message
		};
		const replayBlock = chainAWith2.value.blocks[1];
		if (!replayBlock) return {
			passed: false,
			name,
			error: "no block to replay"
		};
		const result = verifyChain({
			...chainB.value,
			blocks: [chainB.value.blocks[0], replayBlock]
		});
		return {
			passed: !result.valid,
			name,
			...result.valid ? { error: "replay attack not detected — chainId check missing" } : {}
		};
	}
}];
//#endregion
//#region src/suites/verify.ts
const verifySuites = [{
	name: "verify: valid chain returns valid=true",
	run: async () => {
		const kp = generateKeypair();
		if (!kp.ok) return {
			passed: false,
			name: "verify: valid chain returns valid=true",
			error: "keygen failed"
		};
		const chain = createChain({
			content: "valid",
			purpose: "test",
			creatorId: "tester",
			identityType: "anonymous",
			publicKey: kp.value.publicKey
		}, kp.value.privateKey);
		if (!chain.ok) return {
			passed: false,
			name: "verify: valid chain returns valid=true",
			error: chain.error.message
		};
		return {
			passed: verifyChain(chain.value).valid,
			name: "verify: valid chain returns valid=true"
		};
	}
}, {
	name: "verify: tampered content returns valid=false",
	run: async () => {
		const kp = generateKeypair();
		if (!kp.ok) return {
			passed: false,
			name: "verify: tampered content returns valid=false",
			error: "keygen failed"
		};
		const chain = createChain({
			content: "original",
			purpose: "test",
			creatorId: "tester",
			identityType: "anonymous",
			publicKey: kp.value.publicKey
		}, kp.value.privateKey);
		if (!chain.ok) return {
			passed: false,
			name: "verify: tampered content returns valid=false",
			error: chain.error.message
		};
		const result = verifyChain({
			...chain.value,
			blocks: [{
				...chain.value.blocks[0],
				content: "tampered"
			}, ...chain.value.blocks.slice(1)]
		});
		return {
			passed: !result.valid,
			name: "verify: tampered content returns valid=false",
			...result.valid ? { error: "expected invalid but got valid" } : {}
		};
	}
}];
//#endregion
//#region src/suites/index.ts
const allSuites = [
	...genesisSuites,
	...appendSuites,
	...verifySuites,
	...forkSuites,
	...replaySuites
];
//#endregion
//#region src/index.ts
const program = new Command();
program.name("glorychain-conformance").description("Glory Chain protocol conformance test suite").version("0.0.1");
program.command("run").description("Run all conformance suites").option("--json", "Output results as JSON instead of TAP").action(async (opts) => {
	await runSuites(allSuites, { ...opts.json !== void 0 && { json: opts.json } });
});
program.parse();
//#endregion
export {};

//# sourceMappingURL=index.mjs.map