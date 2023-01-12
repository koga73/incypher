#!/usr/bin/env node

const fs = require("fs");
const childProcess = require("child_process");
const homeDir = require("os").homedir().replace(/\\/g, "/");
const readline = require("readline").createInterface({
	input: process.stdin,
	output: process.stdout
});

const {name: packageName, version: packageVersion, author: packageAuthor} = require("../package.json");
const Zip = require("../src/zip");
const CryptoProvider = require("../src/crypto-provider");

const DEBUG = false;
const EXAMPLE_NAME = "ravencoin";
const FILE_MESSAGE = `encrypted with ${packageName} ${_getFixedVersion(packageVersion)} \n`;
const FILENAME_REGEX = /^.*?\.?([^\/\\]+)$/; //https://regex101.com/r/MWeJOz/2
const INCREMENTAL_BUFFER_LEN = 4;
const HEADER_SIZE = FILE_MESSAGE.length + CryptoProvider.IV_LEN + INCREMENTAL_BUFFER_LEN;

const args = process.argv.splice(2);
const argsLen = args.length;

//Start with a random increment
var currentIncrement = (CryptoProvider.random() * 0xffff) >> 0;

async function run() {
	if (argsLen == 0 || (argsLen == 1 && args[0] == "?") || args[0] == "help") {
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
		fileData = await _readEncryptedFile(filePath);
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
			console.log("STORE", storeKey);
			zip.store(storeKey, storeVal);
			await _writeEncryptedFile(filePath, await zip.getStream());
			break;

		case "view":
			if (argsLen < 2 + argIndex) {
				throw new Error("View key required");
			}
			const viewKey = args[argIndex + 1];
			console.log("VIEW", viewKey);
			console.log("");
			console.log("   ", await zip.retrieve(viewKey));
			break;

		case "open":
			if (argsLen < 2 + argIndex) {
				throw new Error("Open key required");
			}
			const openKey = args[argIndex + 1];
			const openFile = openKey.replace(FILENAME_REGEX, "$1");
			const openFileName = zip.ensureExtension(openFile);
			console.log("OPEN", openKey);
			await fs.promises.writeFile(openFileName, await zip.retrieve(openKey));
			childProcess.execSync(openFileName);
			console.log("CLOSE", openFileName);
			await _secureErase(openFileName);
			await fs.promises.rm(openFileName);
			break;

		case "list":
			const entries = await zip.list();
			console.log("LIST");
			console.log("");
			entries.map((entry) => console.log("   ", entry));
			break;

		case "delete":
			if (argsLen < 2 + argIndex) {
				throw new Error("Delete key required");
			}
			const deleteKey = args[argIndex + 1];
			console.log("DELETE", deleteKey);
			await zip.delete(deleteKey);
			await _writeEncryptedFile(filePath, await zip.getStream());
			break;

		case "import":
			const importNumArgs = 2 + argIndex;
			if (argsLen < importNumArgs) {
				throw new Error("File required");
			}
			const importFile = args[argIndex + 1];
			const importKey = argsLen > importNumArgs ? args[argIndex + 2] : importFile.replace(FILENAME_REGEX, "$1");
			const importData = await fs.promises.readFile(importFile);
			console.log("IMPORT", importKey);
			zip.store(importKey, importData);
			await _writeEncryptedFile(filePath, await zip.getStream());
			break;

		case "export":
			const exportNumArgs = 2 + argIndex;
			if (argsLen < exportNumArgs) {
				throw new Error("Export key required");
			}
			const exportKey = args[argIndex + 1];
			const exportFile = argsLen > exportNumArgs ? args[argIndex + 2] : exportKey.replace(FILENAME_REGEX, "$1");
			const exportFileName = zip.ensureExtension(exportFile);
			console.log("EXPORT", exportKey);
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

		default:
			_showCommands();
			break;
	}

	return 0;
}

function _showCommands() {
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

async function _readEncryptedFile(filePath, passpharse = "test123") {
	//Read
	const content = await fs.promises.readFile(filePath);
	console.log("READ", filePath);

	//Decrypt
	let output = content;
	if (_isEncrypted(content)) {
		const {startIV, incremental} = _parseHeader(content.subarray(0, HEADER_SIZE));
		const ciphertext = content.subarray(HEADER_SIZE);
		const fixed = CryptoProvider.deterministic32BitVal(packageName);
		const deterministicIV = CryptoProvider.deterministicIV(startIV, fixed, incremental);
		const key = CryptoProvider.hash(passpharse, Buffer.from(packageAuthor, CryptoProvider.ENCODING));
		try {
			const plaintext = CryptoProvider.decrypt(deterministicIV, key, ciphertext);
			output = plaintext;
			currentIncrement = incremental;
		} catch (err) {
			throw new Error(`Could not decrypt - ${err.message}`);
		}
	}
	return output;
}

//Encrypts file with passphrase
//A starting IV (Initialization Vector) is chosen at random and is written to the file
//currentIncrement value starts at random (0-65535) and increments once each time we save and is written to file
//A deterministic IV is constructed via the starting IV, a fixed value and the incremental value
//The deterministic IV function follows NIST SP-800-38D: 8.2.1 Deterministic Construction
//This ensures that we do not reuse the same IV and it cannot be predicted per AES-GCM specifications
//The salt is appended to the passphrase and then hashed via sha-256
//THe outputing ciphertext includes the GCM tag at the end of the data to verify its integrity
function _writeEncryptedFile(filePath, content, passpharse = "test123") {
	//Encrypt
	let output = content;
	if (passpharse) {
		const startIV = CryptoProvider.randomIV();
		const fixed = CryptoProvider.deterministic32BitVal(packageName);
		const incremental = currentIncrement + 1;
		const deterministicIV = CryptoProvider.deterministicIV(startIV, fixed, incremental);
		const key = CryptoProvider.hash(passpharse, Buffer.from(packageAuthor, CryptoProvider.ENCODING));
		try {
			const ciphertext = CryptoProvider.encrypt(deterministicIV, key, content);
			output = Buffer.concat([_generateHeader(startIV, incremental), ciphertext]);
		} catch (err) {
			throw new Error(`Could not encrypt - ${err.message}`);
		}
	}

	//Write
	console.log("WRITE", filePath);
	return fs.promises.writeFile(filePath, output);
}

function _generateHeader(startIV, incremental) {
	return Buffer.concat([Buffer.from(FILE_MESSAGE, CryptoProvider.ENCODING), startIV, _incrementalToBuffer(incremental)]);
}
function _parseHeader(header) {
	const incrementalBuffer = header.subarray(FILE_MESSAGE.length + CryptoProvider.IV_LEN, FILE_MESSAGE.length + CryptoProvider.IV_LEN + INCREMENTAL_BUFFER_LEN);
	return {
		fileMessage: header.subarray(0, FILE_MESSAGE.length),
		startIV: header.subarray(FILE_MESSAGE.length, FILE_MESSAGE.length + CryptoProvider.IV_LEN),
		incremental: parseInt(incrementalBuffer.toString("hex"), 16)
	};
}

//Convert incremental number into a hex value in a buffer
function _incrementalToBuffer(incremental) {
	const incrementalBuffer = Buffer.alloc(INCREMENTAL_BUFFER_LEN);
	incrementalBuffer.writeUint32BE(incremental);
	return incrementalBuffer;
}

//Determine if file content is encrypted
function _isEncrypted(content) {
	if (content.length < HEADER_SIZE) {
		return false;
	}
	const fileMessage = content.subarray(0, FILE_MESSAGE.length).toString(CryptoProvider.ENCODING);
	//https://regex101.com/r/ajzODa/1
	return FILE_MESSAGE.replace(/^(.+?)\d+.*$/, "$1") == fileMessage.replace(/^(.+?)\d+.*$/, "$1");
}

function _secureErase(filePath) {
	console.log("TODO: Secure erase", filePath);
}

//Convert 1.2.3 to hex 010203
function _getFixedVersion(version) {
	return [...version.matchAll(/\d+/g)]
		.map((val) => {
			const buff = Buffer.alloc(1);
			buff.writeUint8(val[0]);
			return buff;
		})
		.reduce((buff, val) => Buffer.concat([buff, val]), Buffer.alloc(0))
		.toString("hex");
}

(async function execute() {
	console.log("");
	console.log(`${packageName} ${packageVersion}`);
	try {
		const result = await run();
		console.log("");
		process.exit(result);
	} catch (err) {
		if (DEBUG) {
			console.error(err);
		} else {
			console.error(`ERROR: ${err.message}`);
		}
		console.log("");
		process.exit(1);
	}
})();
