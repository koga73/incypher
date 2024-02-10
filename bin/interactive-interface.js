#!/usr/bin/env node

import DeluxeCLI, {Screen, Window, Input, Button, Text, List, ORIGIN, BORDER, CURSOR, RenderLog} from "deluxe-cli";

import BaseInterface from "./base-interface.js";
import ThemeInteractive from "./interactive/theme-interactive.js";
import WindowPrompt from "./interactive/window-prompt.js";

import packageJson from "../package.json" assert {type: "json"};
const {name: packageName, version: packageVersion, author: packageAuthor} = packageJson;

class _class extends BaseInterface {
	constructor(config, filePaths) {
		super(config, filePaths);

		this.logger = RenderLog; //TODO: New logger instance
		this.theme = null;
		this.components = null;

		this._isComplete = false;

		this._doExit = this._doExit.bind(this);
		this._doStore = this._doStore.bind(this);
	}

	async execute(args) {
		const {_doExit, _doStore} = this;

		const listRootOptions = new List({
			id: "listRootOptions",
			label: " Main Menu ",
			position: List.DEFAULT_POSITION.extend({
				paddingTop: 1,
				paddingRight: 2,
				paddingBottom: 1,
				paddingLeft: 2
			}),
			activeIndex: 0,
			items: ["Exit", "Store", "List", "Import", "Export", "Config", "Passphrase", "Erase", "Nuke"],
			onChange: ({activeIndex, activeItem}) => {
				switch (activeItem.toLowerCase()) {
					case "exit":
						txtStatus.value = `Exit the program.`;
						break;
					case "store":
						txtStatus.value = `Store a new value in the keystore.`;
						break;
					case "list":
						txtStatus.value = `List all keys in the keystore.`;
						break;
					case "import":
						txtStatus.value = `Import a file into the keystore.`;
						break;
					case "export":
						txtStatus.value = `Export a file from the keystore.`;
						break;
					case "config":
						txtStatus.value = `Edit the config file.`;
						break;
					case "passphrase":
						txtStatus.value = `Change the passphrase.`;
						break;
					case "erase":
						txtStatus.value = `Securely erase a file.`;
						break;
					case "nuke":
						txtStatus.value = `Securely erase the entire keystore.`;
						break;
				}
			},
			onSelect: ({selectedIndex, selectedItem}) => {
				switch (selectedItem.toLowerCase()) {
					case "exit":
						_doExit();
						break;

					case "store":
						_doStore();
						break;
				}
			}
		});

		const txtStatus = new Text({
			id: "txtStatus",
			value: "Ready",
			position: Text.DEFAULT_POSITION.extend({
				originX: ORIGIN.X.LEFT,
				originY: ORIGIN.Y.BOTTOM,
				marginLeft: -3,
				marginBottom: -1,
				marginRight: -3,
				paddingLeft: 1,
				width: "100%"
			})
		});
		const screenMain = new Screen({
			id: "screenMain",
			position: Screen.DEFAULT_POSITION.extend({
				labelOriginX: ORIGIN.X.CENTER,
				paddingTop: 1,
				paddingRight: 3,
				paddingBottom: 1,
				paddingLeft: 3
			}),
			style: Screen.DEFAULT_STYLE.extend({
				border: BORDER.DOUBLE
			}),
			label: ` ${packageName} v${packageVersion} `,
			children: [listRootOptions, txtStatus]
		});

		this.theme = new ThemeInteractive();
		this.components = {
			screen: screenMain,
			status: txtStatus
		};

		const _this = this;
		(function initialize() {
			_this.theme.applyToComponent(screenMain);

			DeluxeCLI.debug = true;
			DeluxeCLI.initialize();
			DeluxeCLI.clear();
			DeluxeCLI.render(screenMain);

			let showingLog = false;
			DeluxeCLI.onKeyPress = (str, key) => {
				//ctrl+l to view render log
				if (key.ctrl === true && key.name === "l") {
					showingLog = !showingLog;
					if (showingLog) {
						DeluxeCLI.showLog();
					} else {
						DeluxeCLI.hideLog();
					}
				}
			};
		})();

		//Wait while the user interacts
		await new Promise(function run(resolve, reject) {
			_this._isComplete = false;
			(function checkComplete() {
				if (_this._isComplete) {
					resolve();
				} else {
					setImmediate(checkComplete);
				}
			})();
		});

		(function destroy() {
			const {cols, rows} = DeluxeCLI.getWindowSize();
			process.stdout.cursorTo(0, rows - 1);
			process.stdout.write(CURSOR.RESET);
			DeluxeCLI.clear();
			DeluxeCLI.destroy();
			DeluxeCLI.onKeyPress = null;
		})();

		return 0;
	}

	_doExit() {
		const _this = this;
		setTimeout(() => {
			_this._isComplete = true;
		}, 250);
	}

	async _doStore() {
		const {logger, _prompt} = this;

		let key, value;
		try {
			key = await _prompt(`Please enter a name for the key entry`, {
				id: "windowStoreKey",
				inputLabel: " Key name ",
				btnValue: "Next",
				windowLabel: " Store new key "
			});
			logger.log(`Storing new value for "${key}".`);

			value = await _prompt(`Please enter the value for "${key}"`, {
				id: "windowStoreVal",
				inputLabel: " Value ",
				btnValue: "Done",
				windowLabel: " Store new key/value "
			});
		} catch (err) {
			logger.log(err);
			return;
		}

		await this.store(key, value);
	}

	_prompt(question, options) {
		const {theme, components} = this;
		const {screen} = components;

		return new Promise((resolve, reject) => {
			const prompt = new WindowPrompt({
				id: "windowPrompt",
				heading: question,
				...options,
				onSubmit: resolve,
				onClose: () => {
					reject(new Error("User cancelled."));
				}
			});
			theme.applyToComponent(prompt.component);
			screen.addChild(prompt.component);
			prompt.focus();
		});
	}

	async _requestPass(options) {
		const {_prompt} = this;

		return await _prompt("Please enter your passphrase to unlock the keystore", {
			id: "windowPass",
			inputLabel: " Passphrase ",
			inputMask: Input.DEFAULT_MASK,
			btnValue: "Unlock",
			windowLabel: " - ENCRYPTED - ",
			windowLabelOriginX: ORIGIN.X.CENTER,
			...options
		});
	}

	async _resolvePass(pass, options) {
		const {logger, _prompt} = this;

		const passphrase = await _prompt("Create a passphrase to encrypt the keystore", {
			id: "windowPass",
			inputLabel: " Passphrase ",
			inputMask: Input.DEFAULT_MASK,
			btnValue: "Next",
			windowLabel: " - ENCRYPT - ",
			windowLabelOriginX: ORIGIN.X.CENTER,
			...options
		});
		const confirm = await _prompt("Confirm the passphrase to encrypt the keystore", {
			id: "windowPass",
			inputLabel: " Passphrase ",
			inputMask: Input.DEFAULT_MASK,
			btnValue: "Lock",
			windowLabel: " - ENCRYPT - ",
			windowLabelOriginX: ORIGIN.X.CENTER,
			...options
		});
		if (passphrase != confirm) {
			logger.log("Passphrase does not match.");
			//Recycle
			return await _resolvePass(pass, options);
		}
		if (passphrase == "") {
			logger.warn("WARN: Empty password specified - the keystore will not be encrypted!");
		} else {
			logger.log("Passphrase accepted.");
		}
		return passphrase;
	}
}
export default _class;
