#!/usr/bin/env node

import DeluxeCLI, {Screen, Window, Input, Button, Text, List, ORIGIN, BORDER, Theme} from "deluxe-cli";

import ThemeInteractive from "./interactive/theme-interactive.js";
import WindowPrompt from "./interactive/window-prompt.js";

import packageJson from "../package.json" assert {type: "json"};
const {name: packageName, version: packageVersion, author: packageAuthor} = packageJson;

const theme = new ThemeInteractive();

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
				doExit();
				break;

			case "store":
				doStore();
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

function doExit() {
	setTimeout(() => {
		DeluxeCLI.exit();
	}, 250);
}

async function doStore() {
	try {
		const storeKey = await _prompt({
			id: "windowStoreKey",
			heading: `Please enter a name for the key entry`,
			inputLabel: " Key name ",
			btnValue: "Next",
			windowLabel: " Store new key "
		});
		txtStatus.value = `Storing new value for "${storeKey}".`;

		const storeVal = await _prompt({
			id: "windowStoreVal",
			heading: `Please enter the value for "${storeKey}"`,
			inputLabel: " Value ",
			btnValue: "Done",
			windowLabel: " Store new key/value "
		});

		const storePass = await _resolvePass();

		/*const storePass = await readStore(filePath, zip, config, _requestPass);
		txtStatus.value = `Store "${storeKey}".`;
		zip.store(storeKey, storeVal);
		await writeStore(filePath, zip, storePass, config, _resolvePass);
		txtStatus.value = `Stored "${storeKey}".`;*/
	} catch (err) {
		txtStatus.value = err.message;
	}
}

async function _prompt(options) {
	return new Promise((resolve, reject) => {
		const prompt = new WindowPrompt({
			id: "windowPrompt",
			...options,
			onSubmit: (value) => {
				resolve(value);
			},
			onClose: () => {
				reject(new Error("User cancelled."));
			}
		});
		theme.applyToComponent(prompt.component);
		screenMain.addChild(prompt.component);
		prompt.focus();
	});
}

async function _requestPass(zip, options) {
	if (!zip.isEncrypted) {
		return "";
	}
	return await _prompt({
		id: "windowPass",
		heading: "Please enter your passphrase to unlock the keystore",
		inputLabel: " Passphrase ",
		inputMask: Input.DEFAULT_MASK,
		btnValue: "Unlock",
		windowLabel: " - ENCRYPTED - ",
		windowLabelOriginX: ORIGIN.X.CENTER,
		...options
	});
}

async function _resolvePass(pass, options) {
	if (pass != null) {
		return pass;
	}
	const passphrase = await _prompt({
		id: "windowPass",
		heading: "Create a passphrase to encrypt the keystore",
		inputLabel: " Passphrase ",
		inputMask: Input.DEFAULT_MASK,
		btnValue: "Next",
		windowLabel: " - ENCRYPT - ",
		windowLabelOriginX: ORIGIN.X.CENTER,
		...options
	});
	const confirm = await _prompt({
		id: "windowPass",
		heading: "Confirm the passphrase to encrypt the keystore",
		inputLabel: " Passphrase ",
		inputMask: Input.DEFAULT_MASK,
		btnValue: "Lock",
		windowLabel: " - ENCRYPT - ",
		windowLabelOriginX: ORIGIN.X.CENTER,
		...options
	});
	if (passphrase != confirm) {
		txtStatus.value = "Passphrase does not match.";
		//Recycle
		return await _resolvePass(pass, options);
	}
	if (passphrase == "") {
		//TODO: Move to log
		txtStatus.value = "WARN: Empty password specified - the data store will not be encrypted!";
	} else {
		txtStatus.value = "Passphrase accepted.";
	}
	return passphrase;
}

class Interactive {
	static run(args, config, {readStore, writeStore, secureErase}) {
		theme.applyToComponent(screenMain);

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

		return new Promise((resolve, reject) => {});
	}
}
export default Interactive;
