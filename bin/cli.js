#!/usr/bin/env node

const fs = require("fs");
const childProcess = require("child_process");
const homeDir = require("os").homedir().replace(/\\/g, "/");
const readline = require("readline").createInterface({
	input: process.stdin,
	output: process.stdout
});

const {name: packageName, version: packageVersion} = require("../package.json");
const Zip = require("../src/zip");
const CryptoProvider = require("../src/crypto-provider");

const DEBUG = false;
const EXAMPLE_NAME = "ravencoin";
const FILE_MESSAGE = `Encrypted with ${packageName} ${packageVersion} \n`;
const FILENAME_REGEX = /^.*?\.?([^\/\\]+)$/; //https://regex101.com/r/MWeJOz/2

const args = process.argv.splice(2);
const argsLen = args.length;

async function run() {
	if (!argsLen) {
		_showCommands();
		return 0;
	}

	//Check file access
	const isFileAccessible = await fs.promises.access(homeDir, fs.constants.R_OK | fs.constants.W_OK);
	if (isFileAccessible) {
		throw new Error(`${homeDir} is not accessible`);
	}

	//Create or load file data
	let fileData = "";
	const filePath = `${homeDir}/.${packageName}`;
	const isFileExistent = await _fileExists(filePath);
	if (isFileExistent) {
		fileData = await _readFile(filePath);
	} else {
		await fs.promises.writeFile(filePath, "");
	}

	//Create zip instance
	const zip = new Zip({debug: DEBUG});
	if (fileData !== "") {
		await zip.setStream(fileData);
	}

	//Parse arguments
	const argIndex = 0;
	switch (args[argIndex]) {
		case "store":
			const storeNumArgs = 2 + argIndex;
			if (argsLen < storeNumArgs) {
				throw new Error("Store key required");
			}
			const storeKey = args[argIndex + 1];
			const storeVal = argsLen > storeNumArgs ? args.slice(storeNumArgs).join(" ") : await _prompt(`Please enter the value for "${storeKey}"`);
			zip.store(storeKey, storeVal);
			await _writeFile(filePath, await zip.getStream());
			break;

		case "view":
			if (argsLen < 2 + argIndex) {
				throw new Error("View key required");
			}
			const viewKey = args[argIndex + 1];
			console.log(await zip.retrieve(viewKey));
			break;

		case "open":
			if (argsLen < 2 + argIndex) {
				throw new Error("Open key required");
			}
			const openKey = args[argIndex + 1];
			const openFile = openKey.replace(FILENAME_REGEX, "$1");
			const openFileName = zip.ensureExtension(openFile);
			await fs.promises.writeFile(openFileName, await zip.retrieve(openKey));
			childProcess.execSync(openFileName);
			await _secureErase(openFileName);
			await fs.promises.rm(openFileName);
			break;

		case "list":
			const entries = await zip.list();
			entries.map((entry) => console.log(entry));
			break;

		case "delete":
			if (argsLen < 2 + argIndex) {
				throw new Error("Delete key required");
			}
			const deleteKey = args[argIndex + 1];
			await zip.delete(deleteKey);
			await _writeFile(filePath, await zip.getStream());
			break;

		case "import":
			const importNumArgs = 2 + argIndex;
			if (argsLen < importNumArgs) {
				throw new Error("File required");
			}
			const importFile = args[argIndex + 1];
			const importKey = argsLen > importNumArgs ? args[argIndex + 2] : importFile.replace(FILENAME_REGEX, "$1");
			const importData = await fs.promises.readFile(importFile);
			zip.store(importKey, importData);
			await _writeFile(filePath, await zip.getStream());
			break;

		case "export":
			const exportNumArgs = 2 + argIndex;
			if (argsLen < exportNumArgs) {
				throw new Error("Export key required");
			}
			const exportKey = args[argIndex + 1];
			const exportFile = argsLen > exportNumArgs ? args[argIndex + 2] : exportKey.replace(FILENAME_REGEX, "$1");
			const exportFileName = zip.ensureExtension(exportFile);
			await fs.promises.writeFile(exportFileName, await zip.retrieve(exportKey));
			break;

		case "exportall":
			if (argsLen < 2 + argIndex) {
				throw new Error("File required");
			}
			const exportAllFile = args[argIndex + 1];
			console.log("TODO: Export data");
			break;

		case "passwd":
			console.log("TODO: Change password");
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
	console.log("Store seed phrase or keys");
	console.log(`    ${packageName} store ${EXAMPLE_NAME}`);
	console.log(`    ${packageName} store ${EXAMPLE_NAME} this is my ${EXAMPLE_NAME} seed phrase`);
	console.log(`    ${packageName} store seed/${EXAMPLE_NAME} this is my ${EXAMPLE_NAME} seed phrase`);
	console.log("");
	console.log("View seed phrase or key in console");
	console.log(`    ${packageName} view ${EXAMPLE_NAME}`);
	console.log(`    ${packageName} view seed/${EXAMPLE_NAME}`);
	console.log("");
	console.log("Open seed phrase or key with file system default");
	console.log(`    ${packageName} open ${EXAMPLE_NAME}`);
	console.log(`    ${packageName} open seed/${EXAMPLE_NAME}`);
	console.log("");
	console.log("List stores");
	console.log(`    ${packageName} list`);
	console.log("");
	console.log("Delete store(s)");
	console.log(`    ${packageName} delete ${EXAMPLE_NAME}`);
	console.log(`    ${packageName} delete seed/${EXAMPLE_NAME}`);
	console.log(`    ${packageName} delete seed`);
	console.log("");
	console.log("Import file");
	console.log(`    ${packageName} import ./${EXAMPLE_NAME}.txt`);
	console.log(`    ${packageName} import ./${EXAMPLE_NAME}.txt seed/${EXAMPLE_NAME}`);
	console.log("");
	console.log("Export file(s)");
	console.log(`    ${packageName} export ${EXAMPLE_NAME}`);
	console.log(`    ${packageName} export seed/${EXAMPLE_NAME} ./${EXAMPLE_NAME}.txt`);
	console.log(`    ${packageName} exportall ./${packageName}-data`);
	console.log("");
	console.log("Change password");
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

async function _readFile(filePath, passpharse) {
	//Read
	const content = await fs.promises.readFile(filePath);
	console.log("READ", filePath);

	//Decrypt
	let output = content;
	if (passpharse) {
		const ciphertext = content.subarray(FILE_MESSAGE.length);
		const startIV = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10, 0x11, 0x12]);
		const fixed = CryptoProvider.deterministic32BitVal(packageName);
		const incremental = 73;
		const deterministicIV = CryptoProvider.deterministicIV(startIV, fixed, incremental);
		const key = CryptoProvider.hash(passpharse);
		try {
			const plaintext = CryptoProvider.decrypt(deterministicIV, key, ciphertext);
			output = plaintext;
		} catch (err) {
			throw new Error("Could not decrypt");
		}
	}
	return output;
}

function _writeFile(filePath, content, passpharse) {
	//Encrypt
	let output = content;
	if (passpharse) {
		const startIV = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10, 0x11, 0x12]);
		const fixed = CryptoProvider.deterministic32BitVal(packageName);
		const incremental = 73;
		const deterministicIV = CryptoProvider.deterministicIV(startIV, fixed, incremental);
		const key = CryptoProvider.hash(passpharse);
		try {
			const ciphertext = CryptoProvider.encrypt(deterministicIV, key, content);
			output = Buffer.concat([Buffer.from(FILE_MESSAGE, "utf8"), ciphertext]);
		} catch (err) {
			throw new Error("Could not encrypt");
		}
	}

	//Write
	const promise = fs.promises.writeFile(filePath, output);
	console.log("WROTE", filePath);
	return promise;
}

function _secureErase(filePath) {
	console.log("TODO: Secure erase", filePath);
}

(async function execute() {
	try {
		const result = await run();
		process.exit(result);
	} catch (err) {
		if (DEBUG) {
			console.error(err);
		} else {
			console.error(`ERROR: ${err.message}`);
		}
		process.exit(1);
	}
})();
