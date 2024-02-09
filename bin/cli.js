#!/usr/bin/env node

//Node imports
const fsRaw = require("fs");
const {promises: fs, constants: fs_constants} = require("fs");
const path = require("path");
const childProcess = require("child_process");
const homeDir = process.env["INCYPHER_HOME"] || require("os").homedir();
const readline = require("readline");
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

//Local imports
const {name: packageName, version: packageVersion, author: packageAuthor} = require("../package.json");
const CryptoZip = require("../src/crypto-zip");
const CryptoProvider = require("../src/crypto-provider");
const Utils = require("../src/utils");

//Portable mode?
const PORTABLE_DIR = path.join(process.cwd(), `.${packageName}`);
const PORTABLE_MODE = fsRaw.existsSync(PORTABLE_DIR);

//File constants
const DEFAULT_DIR = PORTABLE_MODE ? PORTABLE_DIR : path.join(homeDir, `.${packageName}`);
const CONFIG_FILE = path.join(DEFAULT_DIR, `${packageName}-config.json`);
const CONFIG = {
	name: packageName,
	author: packageAuthor,
	version: packageVersion,
	debug: false,
	backup: PORTABLE_MODE ? false : true,
	store: PORTABLE_MODE ? path.join(`.${packageName}`, `store.${packageName}`) : path.join(DEFAULT_DIR, `store.${packageName}`),
	sync: {
		enabled: false,
		init: `rclone mkdir remote:${packageName}`,
		upload: `rclone copy "${DEFAULT_DIR}" remote:${packageName} --include "*.${packageName}" -v --progress`,
		download: `rclone copy remote:${packageName} "${DEFAULT_DIR}" --include "*.${packageName}" -v --progress`
	}
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
	const isHomeDirAccessible = await fs.access(homeDir, fs_constants.R_OK | fs_constants.W_OK);
	if (isHomeDirAccessible) {
		throw new Error(`${homeDir} is not accessible`);
	}

	//Create directory if needed
	if (!(await Utils.fsExists(DEFAULT_DIR))) {
		await fs.mkdir(DEFAULT_DIR);
		console.log("MKDIR", DEFAULT_DIR);
	}
	//Create config if needed
	if (!(await Utils.fsExists(CONFIG_FILE))) {
		const fileStore = ""; //await _prompt(`File store (leave empty for default: ${CONFIG.store})`);
		const configData = {
			store: fileStore != "" ? fileStore : CONFIG.FILE_STORE,
			...CONFIG
		};
		console.log("WRITE", CONFIG_FILE);
		await fs.writeFile(CONFIG_FILE, JSON.stringify(configData, null, 4));
	}

	//Read config
	config = JSON.parse(await fs.readFile(CONFIG_FILE));

	//Check file access
	const isFileAccessible = await fs.access(path.dirname(config.store), fs_constants.R_OK | fs_constants.W_OK);
	if (isFileAccessible) {
		throw new Error(`${config.store} is not accessible`);
	}

	//Check sync access
	if (config.sync.enabled) {
		if (config.debug) {
			console.log("SYNC ENABLED");
		}
		try {
			childProcess.execSync(config.sync.init);
		} catch (err) {
			throw new Error("Sync init command failed");
		}
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

			const storePass = await _readStore(filePath, zip);
			console.log("STORE", storeKey);
			zip.store(storeKey, storeVal);
			await _writeStore(filePath, zip, storePass);

			break;

		case "view":
			if (argsLen < 2 + argIndex) {
				throw new Error("View key required");
			}
			const viewKey = args[argIndex + 1];

			await _readStore(filePath, zip);
			console.log("VIEW", viewKey);
			console.log("");
			const viewContent = await zip.retrieve(viewKey);
			if (viewContent !== null) {
				console.log("   ", viewContent);
			} else {
				console.log("   ", `--- not found ---`);
			}

			break;

		case "open":
			if (argsLen < 2 + argIndex) {
				throw new Error("Open key required");
			}
			const openKey = args[argIndex + 1];
			const openFile = path.parse(openKey).base;
			const openFileName = path.join(DEFAULT_DIR, Utils.ensureExtension(openFile));

			await _readStore(filePath, zip);
			console.log("OPEN", openKey);
			const openContent = await zip.retrieve(openKey, "uint8array");
			if (openContent) {
				await fs.writeFile(openFileName, openContent);
				childProcess.execSync(openFileName);
				console.log("ERASE", openFileName);
				await _secureErase(openFileName);
			} else {
				console.log("");
				console.log("   ", `--- not found ---`);
			}

			break;

		case "list":
			await _readStore(filePath, zip);
			console.log("LIST");
			console.log("");
			zip.list().map((entry) => console.log("   ", entry));

			break;

		case "delete":
			if (argsLen < 2 + argIndex) {
				throw new Error("Delete key required");
			}
			const deleteKey = args[argIndex + 1];

			const deletePass = await _readStore(filePath, zip);
			console.log("DELETE", deleteKey);
			const deleteContent = await zip.retrieve(deleteKey);
			if (deleteContent) {
				zip.delete(deleteKey);
				await _writeStore(filePath, zip, deletePass);
			} else {
				console.log("");
				console.log("   ", `--- not found ---`);
			}

			break;

		case "import":
			const importNumArgs = 2 + argIndex;
			if (argsLen < importNumArgs) {
				throw new Error("File required");
			}
			const importFile = args[argIndex + 1];
			const importKey = argsLen > importNumArgs ? args[argIndex + 2] : path.parse(importFile).base;
			const importData = await fs.readFile(importFile);

			const importPass = await _readStore(filePath, zip);
			console.log("IMPORT", importKey);
			zip.store(importKey, importData);
			await _writeStore(filePath, zip, importPass);

			break;

		case "export":
			const exportNumArgs = 2 + argIndex;
			if (argsLen < exportNumArgs) {
				throw new Error("Export key required");
			}
			const exportKey = args[argIndex + 1];
			const exportFile = argsLen > exportNumArgs ? args[argIndex + 2] : path.parse(exportKey).base;
			const exportFileName = Utils.ensureExtension(exportFile);

			await _readStore(filePath, zip);
			console.log("EXPORT", exportKey);
			const exportContent = await zip.retrieve(exportKey, "uint8array");
			if (exportContent) {
				await fs.writeFile(exportFileName, exportContent);
			} else {
				console.log("");
				console.log("   ", `--- not found ---`);
			}

			break;

		case "password":
		case "passwd":
			await _readStore(filePath, zip);
			await _writeStore(filePath, zip, null);

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
					const nukeFiles = await fs.readdir(DEFAULT_DIR);
					await Promise.all(
						nukeFiles.map((fileName) => {
							const filePath = path.join(DEFAULT_DIR, fileName);
							console.log("ERASE", filePath);
							return _secureErase(filePath);
						})
					);
					console.log("DELETE", DEFAULT_DIR);
					await fs.rmdir(DEFAULT_DIR);
				}
			}
			break;

		case "config":
			console.log("OPEN", CONFIG_FILE);
			childProcess.execSync(CONFIG_FILE);
			break;

		case "?":
		case "help":
			_showCommands();
			break;

		default:
			//Import file(s)
			if (await Utils.fsExists(args[argIndex])) {
				const defaultImportPass = await _readStore(filePath, zip);
				for (let i = 0; i < argsLen; i++) {
					const defaultImportFile = args[argIndex + i];
					if (await Utils.fsExists(defaultImportFile)) {
						const stat = await fs.stat(defaultImportFile);
						if (stat.isDirectory()) {
							console.warn("WARN: Import of directories is not supported");
						} else {
							const defaultImportKey = path.parse(defaultImportFile).base;
							const defaultImportData = await fs.readFile(defaultImportFile);

							console.log("IMPORT", defaultImportKey);
							zip.store(defaultImportKey, defaultImportData);
						}
					}
				}
				await _writeStore(filePath, zip, defaultImportPass);
				await _prompt("Press enter to exit");
			} else {
				_showCommands();
				await _prompt("Run this program from the command line\nPress enter to exit");
			}
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
	console.log(`    ${packageName} password`);
	console.log("");
	console.log("Secure erase");
	console.log(`    ${packageName} erase ./${EXAMPLE_NAME}.txt`);
	console.log(`    ${packageName} nuke`);
	console.log("");
	console.log("Edit config");
	console.log(`    ${packageName} config`);
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

async function _resolvePass(pass) {
	if (pass != null) {
		return pass;
	}
	const passphrase = await _prompt("Create a passphrase", true);
	const confirm = await _prompt("Confirm the passphrase", true);
	if (passphrase != confirm) {
		throw new Error("Passphrase does not match");
	}
	if (passphrase == "") {
		console.warn("WARN: Empty password specified - the data store will not be encrypted!");
	}
	return passphrase;
}

async function _secureErase(filePath) {
	const stat = await fs.stat(filePath);
	if (stat.isDirectory()) {
		throw new Error("Secure erasure of directories is not supported");
	}
	if (!stat.size) {
		return;
	}
	await fs.writeFile(filePath, CryptoProvider.randomBytes(stat.size));
	await fs.rm(filePath);
}

async function _readStore(filePath, zip) {
	if (config.sync.enabled) {
		console.log("SYNC DOWNLOAD");
		if (config.debug) {
			console.log(config.sync.download);
		}
		try {
			childProcess.execSync(config.sync.download);
		} catch (err) {
			throw new Error("Sync download command failed");
		}
	}

	console.log("READ", filePath);
	const success = await zip.load(filePath);

	const pass = success ? await _requestPass(zip) : null;
	await zip.decrypt(pass);

	return pass;
}

async function _writeStore(filePath, zip, pass) {
	await zip.encrypt(await _resolvePass(pass));

	console.log("WRITE", filePath);
	await zip.save(filePath);

	if (config.sync.enabled) {
		console.log("SYNC UPLOAD");
		if (config.debug) {
			console.log(config.sync.upload);
		}
		try {
			childProcess.execSync(config.sync.upload);
		} catch (err) {
			throw new Error("Sync upload command failed");
		}
	}
}

(async function execute() {
	var result = 0;

	console.log("");
	console.log(`${packageName} ${packageVersion}`);
	console.log("");
	if (PORTABLE_MODE) {
		console.log(`PORTABLE MODE`);
	}

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
