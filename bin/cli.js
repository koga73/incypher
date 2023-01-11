#!/usr/bin/env node

const fs = require("fs");
const homeDir = require("os").homedir();
const readline = require("readline").createInterface({
	input: process.stdin,
	output: process.stdout
});

const {name: packageName, version: packageVersion} = require("../package.json");
const Zip = require("../src/zip");

const args = process.argv.splice(2);
const argsLen = args.length;

async function run() {
	if (!argsLen) {
		_showCommands();
		return 0;
	}

	//Create or load file data
	let fileData = "";
	const isFileAccessible = await fs.promises.access(homeDir, fs.constants.R_OK | fs.constants.W_OK);
	if (isFileAccessible) {
		throw new Error(`${homeDir} is not accessible`);
	}
	const filePath = `${homeDir}/.${packageName}`;
	const isFileExistent = _fileExists(filePath);
	if (isFileExistent) {
		fileData = await fs.promises.readFile(filePath);
	} else {
		await fs.promises.writeFile(filePath, "");
	}

	//Parse arguments
	const zip = new Zip({});
	switch (args[0]) {
		case "store":
			if (argsLen < 2) {
				throw new Error("Store key required");
			}
			const storeKey = args[1];
			const storeVal = argsLen > 2 ? args.slice(2).join(" ") : await _prompt(`Please enter the value for "${storeKey}"`);
			zip.store(storeKey, storeVal);
			break;

		case "view":
			break;

		case "open":
			break;

		case "list":
			break;

		case "delete":
			break;

		case "import":
			break;

		case "export":
			break;

		case "exportall":
			break;

		case "passwd":
			break;

		case "?":
		case "help":
		default:
			_showCommands();
			break;
	}

	return 0;
}

function _showCommands() {
	console.log(`${packageName} ${packageVersion}`);
	console.log("");
	console.log("Usage examples:");
	console.log(`    ${packageName} store seed/helium abcdefg`);
	console.log(`    ${packageName} view seed/helium`);
	console.log(`    ${packageName} open seed/helium`);
	console.log(`    ${packageName} list`);
	console.log(`    ${packageName} delete seed/helium`);
	console.log(`    ${packageName} import ./ravencoin.txt seed/ravencoin`);
	console.log(`    ${packageName} export seed/ravencoin ./ravencoin.txt`);
	console.log(`    ${packageName} exportall ./${packageName}-data/`);
	console.log(`    ${packageName} passwd`);
	console.log("");
}

async function _fileExists(filePath) {
	return await fs.promises
		.stat(filePath)
		.then(() => true)
		.catch(() => false);
}

function _prompt(str) {
	return new Promise((resolve, reject) => {
		readline.question(`${str}\n> `, (input) => {
			resolve(input);
			readline.close();
		});
	});
}

(async function execute() {
	try {
		const result = await run();
		process.exit(result);
	} catch (err) {
		console.error(`ERROR: ${err.message}`);
		process.exit(1);
	}
})();
