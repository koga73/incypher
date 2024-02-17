#!/usr/bin/env node

import childProcess from "child_process";

import DeluxeCLI, {Screen, Window, Input, Button, Text, List, ORIGIN, BORDER, CURSOR, Logger} from "deluxe-cli";

import BaseInterface from "./base-interface.js";
import ThemeInteractive from "./interactive/theme-interactive.js";
import WindowPrompt from "./interactive/window-prompt.js";

import packageJson from "../package.json" assert {type: "json"};
const {name: packageName, version: packageVersion, author: packageAuthor} = packageJson;

class _class extends BaseInterface {
	constructor(config, filePaths) {
		super(config, filePaths);

		this.logger = new Logger({
			output: Logger.OUTPUT.MEMORY,
			level: config.debug ? Logger.LEVEL.DEBUG : Logger.LEVEL.INFO
		});
		this.theme = null;
		this.components = null;

		this._isComplete = false;

		this._setStatus = this._setStatus.bind(this);
		this._doExit = this._doExit.bind(this);
		this._doStore = this._doStore.bind(this);
	}

	async execute(args) {
		const {_setStatus, _doExit, _doStore} = this;

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
			items: ["Exit", "Store", "List", "Import", "Export", "Config", "Passphrase", "More..."],
			onChange: ({activeIndex, activeItem}) => {
				switch (activeItem.toLowerCase()) {
					case "exit":
						_setStatus(`Exit the program.`);
						break;
					case "store":
						_setStatus(`Store a new value in the keystore.`);
						break;
					case "list":
						_setStatus(`List all keys in the keystore.`);
						break;
					case "import":
						_setStatus(`Import a file into the keystore.`);
						break;
					case "config":
						_setStatus(`Edit the config file.`);
						break;
					case "passphrase":
						_setStatus(`Change the passphrase.`);
						break;
					case "more...":
						_setStatus(`More options.`);
						break;
					case "erase":
						_setStatus(`Securely erase a file.`);
						break;
					case "nuke":
						_setStatus(`Securely erase the entire keystore.`);
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

					case "more...":
						const newItems = [...listRootOptions.items];
						newItems.pop(); //Remove "More..."
						newItems.push("Erase", "Nuke");
						listRootOptions.items = newItems;
						listRootOptions.activeIndex = newItems.length - 2;
						listRootOptions.selectedIndex = -1;
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
						DeluxeCLI.showLog(_this.logger.memory);
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

	_setStatus(value) {
		this.components.status.value = value;
	}

	_doExit() {
		const _this = this;
		setTimeout(() => {
			_this._isComplete = true;
		}, 250);
	}

	async _doStore() {
		const {logger, _setStatus, _prompt} = this;

		let key, value;
		try {
			key = await _prompt(`Please enter a name for the key entry`, {
				id: "windowStoreKey",
				inputLabel: " Key name ",
				btnValue: "Next",
				windowLabel: " Store new key "
			});
			_setStatus(`Storing new value for "${key}".`);

			value = await _prompt(`Please enter the value for "${key}"`, {
				id: "windowStoreVal",
				inputLabel: " Value ",
				btnValue: "Done",
				windowLabel: " Store new key/value "
			});
		} catch (err) {
			_setStatus(err.message);
			return;
		}

		try {
			await this.store(key, value);
			_setStatus(`Stored "${key}" successfully.`);
		} catch (err) {
			logger.error(err);
			_setStatus(err.message);
			return;
		}
	}

	_execChildProcess(command) {
		const {logger} = this;
		DeluxeCLI.showLog(logger.memory);
		process.nextTick(() => {
			childProcess.execSync(command);
			DeluxeCLI.hideLog();
		});
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

	async _resolvePass(options) {
		const {_setStatus, _prompt} = this;

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
			_setStatus("Passphrase does not match.");
			//Recycle
			return await _resolvePass(options);
		}
		if (passphrase == "") {
			_setStatus("WARN: Empty password specified - the keystore will not be encrypted!");
		} else {
			_setStatus("Passphrase accepted.");
		}
		return passphrase;
	}
}
export default _class;
