#!/usr/bin/env node

import DeluxeCLI, {Screen, Window, Input, Button, Text, List, ORIGIN, BORDER, Theme} from "deluxe-cli";

import ThemeInteractive from "./interactive/theme-interactive.js";
import WindowRequestPass from "./interactive/window-request-pass.js";

import packageJson from "../package.json" assert {type: "json"};
const {name: packageName, version: packageVersion, author: packageAuthor} = packageJson;

const windowRequestPass = new WindowRequestPass({
	onSubmit: (pass) => {
		txtStatus.value = `Passphrase entered: ${pass}`;
	}
});

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
		switch (activeIndex) {
			case 0:
				txtStatus.value = `Exit the program.`;
				break;
			case 1:
				txtStatus.value = `Store a new value in the keystore.`;
				break;
			case 2:
				txtStatus.value = `List all keys in the keystore.`;
				break;
			case 3:
				txtStatus.value = `Import a file into the keystore.`;
				break;
			case 4:
				txtStatus.value = `Export a file from the keystore.`;
				break;
			case 5:
				txtStatus.value = `Edit the config file.`;
				break;
			case 6:
				txtStatus.value = `Change the passphrase.`;
				break;
			case 7:
				txtStatus.value = `Securely erase a file.`;
				break;
			case 8:
				txtStatus.value = `Securely erase the entire keystore.`;
				break;
		}
	},
	onSelect: ({selectedIndex, selectedItem}) => {
		switch (selectedIndex) {
			case 0:
				setTimeout(() => {
					DeluxeCLI.exit();
				}, 250);
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
	children: [listRootOptions, txtStatus, windowRequestPass.component]
});

class Interactive {
	static run(args, config, {readStore, writeStore, secureErase}) {
		const theme = new ThemeInteractive();
		theme.applyToComponent(screenMain);

		DeluxeCLI.debug = true;
		DeluxeCLI.initialize();
		DeluxeCLI.clear();
		windowRequestPass.focus();
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
