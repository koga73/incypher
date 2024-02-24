#!/usr/bin/env node

import childProcess from "child_process";

import DeluxeCLI, {Screen, Input, Text, List, ScrollBar, ORIGIN, BORDER, CURSOR, Logger} from "deluxe-cli";

import BaseInterface from "./base-interface.js";
import ThemeInteractive from "./interactive/theme-interactive.js";
import WindowPrompt from "./interactive/window-prompt.js";
import WindowAbout from "./interactive/window-about.js";

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
		this._showingLog = false;

		this._setStatus = this._setStatus.bind(this);
		this._doExit = this._doExit.bind(this);
		this._doStore = this._doStore.bind(this);
		this._doList = this._doList.bind(this);
		this._toggleLog = this._toggleLog.bind(this);
		this._doAbout = this._doAbout.bind(this);
		this._showAboutWindow = this._showAboutWindow.bind(this);
	}

	async execute(args) {
		const {logger, _setStatus, _doExit, _doStore, _doList, _toggleLog, _doAbout} = this;

		const listMenu = new List({
			id: "listMenu",
			label: " Main Menu ",
			position: List.DEFAULT_POSITION.extend({
				paddingTop: 1,
				paddingRight: 2,
				paddingBottom: 1,
				paddingLeft: 2
			}),
			activeIndex: 0,
			items: ["Exit", "Store", "List", "Import", "Config", "Passphrase", "More..."],
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
					case "log":
						_setStatus(`View the log.`);
						break;
					case "about":
						_setStatus(`About this program.`);
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

					case "list":
						_doList();
						break;

					case "more...":
						const newItems = [...listMenu.items];
						newItems.pop(); //Remove "More..."
						newItems.push("Erase", "Nuke", "Log", "About");
						listMenu.items = newItems;
						listMenu.activeIndex = newItems.length - 4;
						listMenu.selectedIndex = -1;
						break;

					case "log":
						_toggleLog();
						logger.log();
						logger.log(`Press [escape] to close the log.`);
						logger.log(`Note: You can access the log at any time by pressing [ctrl+l].`);
						break;

					case "about":
						_doAbout();
						break;
				}
			},
			onKeyPress: (str, key) => {
				//On escape jump to exit, if on exit then doExit
				if (key.escape) {
					if (listMenu.selectedIndex === 0) {
						_doExit();
					} else {
						listMenu.selectedIndex = 0;
					}
				}
			}
		});

		const listKeys = new List({
			id: "listKeys",
			position: List.DEFAULT_POSITION.extend({
				paddingTop: 1,
				paddingRight: 2,
				paddingBottom: 1,
				paddingLeft: 2
			}),
			style: List.DEFAULT_STYLE.extend({
				border: BORDER.NONE
			}),
			activeIndex: 0,
			items: ["< Back"],
			onChange: ({activeIndex, activeItem}) => {
				switch (activeItem.toLowerCase()) {
					case "< back":
						_setStatus(`Go back.`);
						break;
					default:
						_setStatus("Select for further actions.");
						break;
				}
			}
		});
		const sbListKeys = new ScrollBar({
			id: "sbListKeys",
			focusable: false,
			position: ScrollBar.DEFAULT_POSITION.extend({
				marginBottom: 1,
				marginRight: 1,
				width: "50%",
				height: "100%"
			}),
			label: " Keys ",
			children: [listKeys]
		});
		const listActions = new List({
			id: "listActions",
			position: List.DEFAULT_POSITION.extend({
				originX: ORIGIN.X.RIGHT,
				labelOriginX: ORIGIN.X.LEFT,
				paddingTop: 1,
				paddingRight: 2,
				paddingBottom: 1,
				paddingLeft: 2,
				marginLeft: 1,
				width: "50%"
			}),
			label: " Actions ",
			activeIndex: 0,
			items: ["< Back", "View", "Open", "Edit", "Delete", "Export"],
			onChange: ({activeIndex, activeItem}) => {
				switch (activeItem.toLowerCase()) {
					case "< back":
						_setStatus(`Go back.`);
						break;
					case "view":
						_setStatus(`View the value.`);
						break;
					case "open":
						_setStatus(`Open with system default.`);
						break;
					case "edit":
						_setStatus(`Edit the value.`);
						break;
					case "delete":
						_setStatus(`Delete the key.`);
						break;
					case "export":
						_setStatus(`Export the data.`);
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
			label: ` ${packageName} `,
			children: [listMenu, txtStatus]
		});

		this.theme = new ThemeInteractive();
		this.components = {
			listMenu,
			listKeys,
			sbListKeys,
			listActions,
			status: txtStatus,
			screen: screenMain
		};

		const _this = this;
		(function initialize() {
			_this.theme.applyToComponent(sbListKeys);
			_this.theme.applyToComponent(listActions);
			_this.theme.applyToComponent(screenMain);

			DeluxeCLI.debug = true;
			DeluxeCLI.initialize({exitOnEscape: false});
			DeluxeCLI.clear();
			DeluxeCLI.render(screenMain);

			DeluxeCLI.onKeyPress = (str, key) => {
				//ctrl+l to view render log
				if (key.ctrl === true && key.name === "l") {
					_this._toggleLog();
				}
				if (key.escape && _this._showingLog) {
					_this._toggleLog();
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

	_toggleLog() {
		this._showingLog = !this._showingLog;
		if (this._showingLog) {
			DeluxeCLI.showLog(this.logger.memory);
		} else {
			DeluxeCLI.hideLog();
		}
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

	async _doList() {
		const {logger, theme, components, _setStatus} = this;
		const {listMenu, listKeys, sbListKeys, listActions, screen} = components;

		let list = [];
		try {
			list = await this.list();
		} catch (err) {
			logger.error(err);
			_setStatus(err.message);
			return;
		}

		if (list.length == 0) {
			_setStatus(`Keystore is empty.`);
			return;
		}
		function backToMenu() {
			listActions.remove();
			sbListKeys.remove();
			screen.addChild(listMenu);
			DeluxeCLI.focus(listMenu);
		}
		function backToKeys() {
			DeluxeCLI.focus(listKeys);
			listActions.remove();
		}

		listKeys.onSelect = ({selectedIndex, selectedItem}) => {
			if (selectedIndex === 0) {
				backToMenu();
				return;
			}
			//TODO: Modify actions based on extension

			listActions.onBlur = () => {
				//TODO: FIX THIS AS IT CAUSES A BUG
				//backToKeys();
			};
			screen.addChild(listActions);
			DeluxeCLI.focus(listActions);
		};
		listKeys.onKeyPress = (str, key) => {
			if (key.name === "escape") {
				backToMenu();
				return;
			}
		};
		listKeys.items = [listKeys.items[0], ...list];

		listActions.onKeyPress = (str, key) => {
			if (key.name === "escape") {
				backToKeys();
				return;
			}
		};
		listActions.onSelect = ({selectedIndex, selectedItem}) => {
			if (selectedIndex === 0) {
				backToKeys();
				return;
			}
		};

		//Show the list
		listMenu.remove();
		screen.addChild(sbListKeys);
		DeluxeCLI.focus(listKeys);

		_setStatus(`Listed ${list.length} keys.`);
	}

	async _doAbout(options) {
		const {_showAboutWindow} = this;

		try {
			await _showAboutWindow(options);
		} catch (err) {
			//Do nothing
		}
	}

	_showAboutWindow(options) {
		const {theme, components} = this;
		const {screen} = components;

		return new Promise((resolve, reject) => {
			const about = new WindowAbout({
				id: "windowAbout",
				...options,
				onSubmit: resolve,
				onClose: () => {
					reject(new Error("User closed."));
				}
			});
			theme.applyToComponent(about.component);
			screen.addChild(about.component);
			about.focus();
		});
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

	async _promptPassExisting(options) {
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

	async _promptPassNew(options) {
		const {_setStatus, _prompt, _promptPassNew} = this;

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
			return await _promptPassNew(options);
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
