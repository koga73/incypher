//Node imports
import {promises as fs} from "fs";
import path from "path";
import childProcess from "child_process";
import readline from "readline";

//Local imports
import CryptoZip from "../src/crypto-zip.js";
import Utils from "../src/utils.js";

//package.json
import packageJson from "../package.json" assert {type: "json"};
const {name: packageName, version: packageVersion, author: packageAuthor} = packageJson;

//Misc constants
const EXAMPLE_NAME = "ravencoin";

class _class {
	static async run(args, config, {defaultDir, configFile}, {readStore, writeStore, secureErase}) {
		const zip = new CryptoZip({
			debug: config.debug,
			backup: config.backup,
			defaultDir: defaultDir
		});
		const filePath = config.store;

		const argIndex = 0;
		const argsLen = args.length;
		switch (args[argIndex]) {
			case "store":
				const storeNumArgs = 2 + argIndex;
				if (argsLen < storeNumArgs) {
					throw new Error("Store key required");
				}
				const storeKey = args[argIndex + 1];
				const storeVal = await _prompt(`Please enter the value for "${storeKey}"`);

				const storePass = await readStore(filePath, zip, config, _requestPass);
				console.log("STORE", storeKey);
				zip.store(storeKey, storeVal);
				await writeStore(filePath, zip, storePass, config, _resolvePass);

				break;

			case "view":
				if (argsLen < 2 + argIndex) {
					throw new Error("View key required");
				}
				const viewKey = args[argIndex + 1];

				await readStore(filePath, zip, config, _requestPass);
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
				const openFileName = path.join(defaultDir, Utils.ensureExtension(openFile));

				await readStore(filePath, zip, config, _requestPass);
				console.log("OPEN", openKey);
				const openContent = await zip.retrieve(openKey, "uint8array");
				if (openContent) {
					await fs.writeFile(openFileName, openContent);
					childProcess.execSync(openFileName);
					console.log("ERASE", openFileName);
					await secureErase(openFileName);
				} else {
					console.log("");
					console.log("   ", `--- not found ---`);
				}

				break;

			case "list":
				await readStore(filePath, zip, config, _requestPass);
				console.log("LIST");
				console.log("");
				zip.list().map((entry) => console.log("   ", entry));

				break;

			case "delete":
				if (argsLen < 2 + argIndex) {
					throw new Error("Delete key required");
				}
				const deleteKey = args[argIndex + 1];

				const deletePass = await readStore(filePath, zip, config, _requestPass);
				console.log("DELETE", deleteKey);
				const deleteContent = await zip.retrieve(deleteKey);
				if (deleteContent) {
					zip.delete(deleteKey);
					await writeStore(filePath, zip, deletePass, config, _resolvePass);
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

				const importPass = await readStore(filePath, zip, config, _requestPass);
				console.log("IMPORT", importKey);
				zip.store(importKey, importData);
				await writeStore(filePath, zip, importPass, config, _resolvePass);

				break;

			case "export":
				const exportNumArgs = 2 + argIndex;
				if (argsLen < exportNumArgs) {
					throw new Error("Export key required");
				}
				const exportKey = args[argIndex + 1];
				const exportFile = argsLen > exportNumArgs ? args[argIndex + 2] : path.parse(exportKey).base;
				const exportFileName = Utils.ensureExtension(exportFile);

				await readStore(filePath, zip, config, _requestPass);
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
				await readStore(filePath, zip, _requestPass, config);
				await writeStore(filePath, zip, null, config, _resolvePass);

				break;

			case "erase":
				if (argsLen < 2 + argIndex) {
					throw new Error("File required");
				}
				const eraseFile = args[argIndex + 1];

				console.log("ERASE", eraseFile);
				await secureErase(eraseFile);

				break;

			case "nuke":
				const nukeConfirm = await _prompt(`Type "yes" to erase ${filePath} and ${defaultDir}`);
				if (nukeConfirm == "yes") {
					if (await Utils.fsExists(filePath)) {
						console.log("ERASE", filePath);
						await secureErase(filePath);
					}
					if (await Utils.fsExists(defaultDir)) {
						const nukeFiles = await fs.readdir(defaultDir);
						await Promise.all(
							nukeFiles.map((fileName) => {
								const filePath = path.join(defaultDir, fileName);
								console.log("ERASE", filePath);
								return secureErase(filePath);
							})
						);
						console.log("DELETE", defaultDir);
						await fs.rmdir(defaultDir);
					}
				}
				break;

			case "config":
				console.log("OPEN", configFile);
				childProcess.execSync(configFile);
				break;

			case "?":
			case "help":
				_showCommands();
				break;

			default:
				//Import file(s)
				if (await Utils.fsExists(args[argIndex])) {
					const defaultImportPass = await readStore(filePath, zip, config, _requestPass);
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
					await writeStore(filePath, zip, defaultImportPass, config, _resolvePass);
					await _prompt("Press enter to exit");
				} else {
					_showCommands();
					await _prompt("Run this program from the command line\nPress enter to exit");
				}
				break;
		}

		return 0;
	}
}
export default _class;

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
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	//https://stackoverflow.com/a/59727173/3610169
	function _handler_readline_keypress(c, k) {
		let len = rl.line.length;
		readline.moveCursor(rl.output, -len, 0);
		readline.clearLine(rl.output, 1);
		rl.output.write("*".repeat(len));
	}

	if (hidden) {
		rl.input.on("keypress", _handler_readline_keypress);
	}
	return new Promise((resolve, reject) => {
		rl.question(`\n${str}\n> `, (input) => {
			if (hidden) {
				rl.input.off("keypress", _handler_readline_keypress);
			}
			resolve(input);
			rl.close();
		});
	});
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
