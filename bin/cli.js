#!/usr/bin/env node

//Node imports
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const homeDir = require("os").homedir();
const readline = require("readline");
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

//Local imports
const {name: packageName, version: packageVersion} = require("../package.json");
const CryptoZip = require("../src/crypto-zip");
const CryptoProvider = require("../src/crypto-provider");
const Utils = require("../src/utils");

//File constants
const DEFAULT_DIR = path.join(homeDir, `.${packageName}`);
const CONFIG_FILE = path.join(DEFAULT_DIR, `${packageName}-config.json`);
const CONFIG = {
	name: packageName,
	version: packageVersion,
	debug: false,
	store: path.join(DEFAULT_DIR, `store.${packageName}`),
	backup: true
};

//Misc constants
const EXAMPLE_NAME = "ravencoin";

//Args
const args = process.argv.splice(2);
const argsLen = args.length;

//Global variables
var config = CONFIG;

async function _initialize() {
	//Check home directory access
	const isHomeDirAccessible = await fs.promises.access(homeDir, fs.constants.R_OK | fs.constants.W_OK);
	if (isHomeDirAccessible) {
		throw new Error(`${homeDir} is not accessible`);
	}

	//Create directory if needed
	if (!(await Utils.fsExists(DEFAULT_DIR))) {
		await fs.promises.mkdir(DEFAULT_DIR);
		console.log("MKDIR", DEFAULT_DIR);
	}
	//Create config if needed
	if (!(await Utils.fsExists(CONFIG_FILE))) {
		const fileStore = await _prompt(`File store (leave empty for default: ${CONFIG.store})`);
		const configData = {
			store: fileStore != "" ? fileStore : CONFIG.FILE_STORE,
			...CONFIG
		};
		console.log("WRITE", CONFIG_FILE);
		await fs.promises.writeFile(CONFIG_FILE, JSON.stringify(configData, null, 4));
	}

	//Read config
	config = JSON.parse(await fs.promises.readFile(CONFIG_FILE));

	//Check file access
	const isFileAccessible = await fs.promises.access(path.dirname(config.store), fs.constants.R_OK | fs.constants.W_OK);
	if (isFileAccessible) {
		throw new Error(`${config.store} is not accessible`);
	}
}

async function _parseArguments() {
	const zip = new CryptoZip({
		debug: config.debug,
		backup: config.backup,
		defaultDir: DEFAULT_DIR
	});
	const filePath = config.store;

	const argIndex = 0;
	switch (args[argIndex]) {
		case "store":
			const storeNumArgs = 2 + argIndex;
			if (argsLen < storeNumArgs) {
				throw new Error("Store key required");
			}
			const storeKey = args[argIndex + 1];
			const storeVal = await _prompt(`Please enter the value for "${storeKey}"`);

			console.log("READ", filePath);
			await zip.load(filePath);

			const storePass = await _requestPass(zip);
			await zip.decrypt(storePass);

			console.log("STORE", storeKey);
			zip.store(storeKey, storeVal);

			console.log("WRITE", filePath);
			await zip.encrypt(await _resolveNewPass(storePass));
			await zip.save(filePath);

			break;

		case "view":
			if (argsLen < 2 + argIndex) {
				throw new Error("View key required");
			}
			const viewKey = args[argIndex + 1];

			console.log("READ", filePath);
			await zip.load(filePath);

			const viewPass = await _requestPass(zip);
			await zip.decrypt(viewPass);

			console.log("VIEW", viewKey);
			console.log("");
			console.log("   ", await zip.retrieve(viewKey));

			break;

		case "open":
			if (argsLen < 2 + argIndex) {
				throw new Error("Open key required");
			}
			const openKey = args[argIndex + 1];
			const openFile = path.parse(openKey).base;
			const openFileName = path.join(DEFAULT_DIR, Utils.ensureExtension(openFile));

			console.log("READ", filePath);
			await zip.load(filePath);

			const openPass = await _requestPass(zip);
			await zip.decrypt(openPass);

			console.log("OPEN", openKey);
			const openContent = await zip.retrieve(openKey, "uint8array");
			if (openContent) {
				await fs.promises.writeFile(openFileName, openContent);
				try {
					childProcess.execSync(openFileName);
				} catch (err) {
					//Do nothing
				}

				console.log("ERASE", openFileName);
				await _secureErase(openFileName);
			} else {
				console.log("");
				console.log("   ", `${openKey} not found`);
			}

			break;

		case "list":
			console.log("READ", filePath);
			await zip.load(filePath);

			const listPass = await _requestPass(zip);
			await zip.decrypt(listPass);

			console.log("LIST");
			console.log("");
			zip.list().map((entry) => console.log("   ", entry));

			break;

		case "delete":
			if (argsLen < 2 + argIndex) {
				throw new Error("Delete key required");
			}
			const deleteKey = args[argIndex + 1];

			console.log("READ", filePath);
			await zip.load(filePath);

			const deletePass = await _requestPass(zip);
			await zip.decrypt(deletePass);

			console.log("DELETE", deleteKey);
			zip.delete(deleteKey);

			console.log("WRITE", filePath);
			await zip.encrypt(await _resolveNewPass(deletePass));
			await zip.save(filePath);

			break;

		case "import":
			const importNumArgs = 2 + argIndex;
			if (argsLen < importNumArgs) {
				throw new Error("File required");
			}
			const importFile = args[argIndex + 1];
			const importKey = argsLen > importNumArgs ? args[argIndex + 2] : path.parse(importFile).base;
			const importData = await fs.promises.readFile(importFile);

			console.log("READ", filePath);
			await zip.load(filePath);

			const importPass = await _requestPass(zip);
			await zip.decrypt(importPass);

			console.log("IMPORT", importKey);
			zip.store(importKey, importData);

			console.log("WRITE", filePath);
			await zip.encrypt(await _resolveNewPass(importPass));
			await zip.save(filePath);

			break;

		case "export":
			const exportNumArgs = 2 + argIndex;
			if (argsLen < exportNumArgs) {
				throw new Error("Export key required");
			}
			const exportKey = args[argIndex + 1];
			const exportFile = argsLen > exportNumArgs ? args[argIndex + 2] : path.parse(exportKey).base;
			const exportFileName = Utils.ensureExtension(exportFile);

			console.log("READ", filePath);
			await zip.load(filePath);

			const exportPass = await _requestPass(zip);
			await zip.decrypt(exportPass);

			console.log("EXPORT", exportKey);
			const exportContent = await zip.retrieve(exportKey, "uint8array");
			if (exportContent) {
				await fs.promises.writeFile(exportFileName, exportContent);
			} else {
				console.log("");
				console.log("   ", `${exportKey} not found`);
			}

			break;

		case "passwd":
			console.log("READ", filePath);
			await zip.load(filePath);

			const passwdPass = await _requestPass(zip);
			await zip.decrypt(passwdPass);

			console.log("WRITE", filePath);
			await zip.encrypt(await _resolveNewPass(null));
			await zip.save(filePath);

			break;

		case "erase":
			if (argsLen < 2 + argIndex) {
				throw new Error("File required");
			}
			const eraseFile = args[argIndex + 1];

			console.log("ERASE", eraseFile);
			await _secureErase(eraseFile);

			break;

		case "nuke":
			const nukeConfirm = await _prompt(`Type "yes" to erase ${filePath} and ${DEFAULT_DIR}`);
			if (nukeConfirm == "yes") {
				if (await Utils.fsExists(filePath)) {
					console.log("ERASE", filePath);
					await _secureErase(filePath);
				}
				if (await Utils.fsExists(DEFAULT_DIR)) {
					const nukeFiles = await fs.promises.readdir(DEFAULT_DIR);
					await Promise.all(
						nukeFiles.map((fileName) => {
							const filePath = path.join(DEFAULT_DIR, fileName);
							console.log("ERASE", filePath);
							return _secureErase(filePath);
						})
					);
					console.log("DELETE", DEFAULT_DIR);
					await fs.promises.rmdir(DEFAULT_DIR);
				}
			}
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
	console.log("");
	console.log("Store seed phrase or keys");
	console.log(`    ${packageName} store ${EXAMPLE_NAME}`);
	console.log(`    ${packageName} store seed/${EXAMPLE_NAME}`);
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
	console.log("Export file");
	console.log(`    ${packageName} export ${EXAMPLE_NAME}`);
	console.log(`    ${packageName} export seed/${EXAMPLE_NAME} ./${EXAMPLE_NAME}.txt`);
	console.log("");
	console.log("Change password");
	console.log(`    ${packageName} passwd`);
	console.log("");
	console.log("Secure erase");
	console.log(`    ${packageName} erase ./${EXAMPLE_NAME}.txt`);
	console.log(`    ${packageName} nuke`);
}

function _prompt(str, hidden) {
	if (hidden) {
		rl.input.on("keypress", _handler_readline_keypress);
	}
	return new Promise((resolve, reject) => {
		rl.question(`\n${str}\n> `, (input) => {
			if (hidden) {
				rl.input.off("keypress", _handler_readline_keypress);
			}
			resolve(input);
		});
	});
}

//https://stackoverflow.com/a/59727173/3610169
function _handler_readline_keypress(c, k) {
	let len = rl.line.length;
	readline.moveCursor(rl.output, -len, 0);
	readline.clearLine(rl.output, 1);
	rl.output.write("*".repeat(len));
}

async function _requestPass(zip) {
	if (!zip.isEncrypted) {
		return "";
	}
	return await _prompt("Enter the passphrase", true);
}

async function _resolveNewPass(pass) {
	if (pass && pass != "") {
		return pass;
	}
	const passphrase = await _prompt("Create a passphrase", true);
	const confirm = await _prompt("Confirm the passphrase", true);
	if (passphrase != confirm) {
		throw new Error("Passphrase does not match");
	}
	return passphrase;
}

async function _secureErase(filePath) {
	const stat = await fs.promises.stat(filePath);
	if (stat.isDirectory()) {
		throw new Error("Secure erasure of directories is not supported");
	}
	if (!stat.size) {
		return;
	}
	await fs.promises.writeFile(filePath, CryptoProvider.randomBytes(stat.size));
	await fs.promises.rm(filePath);
}

(async function execute() {
	var result = 0;

	console.log("");
	console.log(`${packageName} ${packageVersion}`);
	try {
		await _initialize();
		result = await _parseArguments();
	} catch (err) {
		if (config.debug) {
			console.error(err);
		} else {
			console.error(`ERROR: ${err.message}`);
		}
		result = 1;
	} finally {
		rl.close();
		console.log("");
		process.exit(result);
	}
})();
