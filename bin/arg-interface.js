//Node imports
import path from "path";
import readline from "readline";

//Local imports
import BaseInterface from "./base-interface.js";
import Utils from "../src/utils.js";

//package.json
import packageJson from "../package.json" assert {type: "json"};
const {name: packageName, version: packageVersion, author: packageAuthor} = packageJson;

//Misc constants
const EXAMPLE_NAME = "ravencoin";

class _class extends BaseInterface {
	constructor(config, filePaths) {
		super(config, filePaths);

		this.logger = console;
	}

	async execute(args) {
		const {filePath, defaultDir} = this;

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
				await this.store(storeKey, storeVal);
				break;

			case "view":
				if (argsLen < 2 + argIndex) {
					throw new Error("View key required");
				}
				const viewKey = args[argIndex + 1];
				await this.view(viewKey);
				break;

			case "open":
				if (argsLen < 2 + argIndex) {
					throw new Error("Open key required");
				}
				const openKey = args[argIndex + 1];
				await this.open(openKey);
				break;

			case "list":
				await this.list();
				break;

			case "delete":
				if (argsLen < 2 + argIndex) {
					throw new Error("Delete key required");
				}
				const deleteKey = args[argIndex + 1];
				await this.delete(deleteKey);
				break;

			case "import":
				const importNumArgs = 2 + argIndex;
				if (argsLen < importNumArgs) {
					throw new Error("File required");
				}
				const importFile = args[argIndex + 1];
				const importKey = argsLen > importNumArgs ? args[argIndex + 2] : path.parse(importFile).base;
				await this.import(importFile, importKey);
				break;

			case "export":
				const exportNumArgs = 2 + argIndex;
				if (argsLen < exportNumArgs) {
					throw new Error("Export key required");
				}
				const exportKey = args[argIndex + 1];
				const exportFile = argsLen > exportNumArgs ? args[argIndex + 2] : path.parse(exportKey).base;
				await this.export(exportKey, exportFile);
				break;

			case "password":
			case "passwd":
				await this.password();
				break;

			case "erase":
				if (argsLen < 2 + argIndex) {
					throw new Error("File required");
				}
				const eraseFile = args[argIndex + 1];
				await this.erase(eraseFile);
				break;

			case "nuke":
				const nukeConfirm = await _prompt(`Type "yes" to erase ${filePath} and ${defaultDir}`);
				if (nukeConfirm == "yes") {
					await this.nuke();
				}
				break;

			case "config":
				this.openConfig();
				break;

			case "?":
			case "help":
				this._showCommands();
				break;

			default:
				//Import file(s)
				if (await Utils.fsExists(args[argIndex])) {
					await this.importMany(args.slice(argIndex));
					await _prompt("Press enter to exit");
				} else {
					_showCommands();
					await _prompt("Run this program from the command line\nPress enter to exit");
				}
				break;
		}

		return 0;
	}

	_prompt(question, options) {
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

		if (options.hidden) {
			rl.input.on("keypress", _handler_readline_keypress);
		}
		return new Promise((resolve, reject) => {
			rl.question(`\n${question}\n> `, (input) => {
				if (options.hidden) {
					rl.input.off("keypress", _handler_readline_keypress);
				}
				resolve(input);
				rl.close();
			});
		});
	}

	async _promptPassExisting(options) {
		const {_prompt} = this;

		return await _prompt("Enter the passphrase", {...options, hidden: true});
	}

	async _promptPassNew(options) {
		const {_prompt, logger} = this;

		const passphrase = await _prompt("Create a passphrase", {...options, hidden: true});
		const confirm = await _prompt("Confirm the passphrase", {...options, hidden: true});
		if (passphrase != confirm) {
			throw new Error("Passphrase does not match");
		}
		if (passphrase == "") {
			logger.warn("WARN: Empty password specified - the keystore will not be encrypted!");
		} else {
			logger.log("Passphrase accepted");
		}
		return passphrase;
	}

	_showCommands() {
		logger.log("");
		logger.log("Store seed phrase or keys");
		logger.log(`    ${packageName} store ${EXAMPLE_NAME}`);
		logger.log(`    ${packageName} store seed/${EXAMPLE_NAME}`);
		logger.log("");
		logger.log("View seed phrase or key in console");
		logger.log(`    ${packageName} view ${EXAMPLE_NAME}`);
		logger.log(`    ${packageName} view seed/${EXAMPLE_NAME}`);
		logger.log("");
		logger.log("Open seed phrase or key with file system default");
		logger.log(`    ${packageName} open ${EXAMPLE_NAME}`);
		logger.log(`    ${packageName} open seed/${EXAMPLE_NAME}`);
		logger.log("");
		logger.log("List stores");
		logger.log(`    ${packageName} list`);
		logger.log("");
		logger.log("Delete store(s)");
		logger.log(`    ${packageName} delete ${EXAMPLE_NAME}`);
		logger.log(`    ${packageName} delete seed/${EXAMPLE_NAME}`);
		logger.log(`    ${packageName} delete seed`);
		logger.log("");
		logger.log("Import file");
		logger.log(`    ${packageName} import ./${EXAMPLE_NAME}.txt`);
		logger.log(`    ${packageName} import ./${EXAMPLE_NAME}.txt seed/${EXAMPLE_NAME}`);
		logger.log("");
		logger.log("Export file");
		logger.log(`    ${packageName} export ${EXAMPLE_NAME}`);
		logger.log(`    ${packageName} export seed/${EXAMPLE_NAME} ./${EXAMPLE_NAME}.txt`);
		logger.log("");
		logger.log("Change password");
		logger.log(`    ${packageName} password`);
		logger.log("");
		logger.log("Secure erase");
		logger.log(`    ${packageName} erase ./${EXAMPLE_NAME}.txt`);
		logger.log(`    ${packageName} nuke`);
		logger.log("");
		logger.log("Edit config");
		logger.log(`    ${packageName} config`);
	}
}
export default _class;
