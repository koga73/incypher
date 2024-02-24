import DeluxeCLI, {Window, Button, Text, ORIGIN, BORDER} from "deluxe-cli";

import ThemeInteractive from "./theme-interactive.js";

import packageJson from "../../package.json" assert {type: "json"};
const {name: packageName, version: packageVersion, author: packageAuthor, description: packageDescription} = packageJson;

class WindowPrompt {
	constructor({id, userClosable = true, onSubmit = null, onClose = null}) {
		const txtName = new Text({
			id: `${id}_name`,
			value: `${ThemeInteractive.COLORS.LABEL}Name:${ThemeInteractive.COLORS.TEXT} ${packageName}`
		});
		const txtVersion = new Text({
			id: `${id}_version`,
			value: `${ThemeInteractive.COLORS.LABEL}Version:${ThemeInteractive.COLORS.TEXT} ${packageVersion}`
		});
		const txtAuthor = new Text({
			id: `${id}_author`,
			value: `${ThemeInteractive.COLORS.LABEL}Author:${ThemeInteractive.COLORS.TEXT} ${packageAuthor.name}`
		});
		const txtDescription = new Text({
			id: `${id}_description`,
			value: `${ThemeInteractive.COLORS.LABEL}Description:${ThemeInteractive.COLORS.TEXT} ${packageDescription}`
		});

		const btnSubmit = new Button({
			id: `${id}_btn`,
			position: Button.DEFAULT_POSITION.extend({
				marginTop: 1,
				marginBottom: 1
			}),
			value: "OK",
			onSelect: doSubmit
		});
		const window = new Window({
			id,
			position: Window.DEFAULT_POSITION.extend({
				originX: ORIGIN.X.CENTER,
				originY: ORIGIN.Y.CENTER,
				labelOriginX: ORIGIN.X.CENTER,
				width: "100%",
				height: 0, //Auto
				paddingTop: 1,
				paddingRight: 2,
				paddingBottom: 1,
				paddingLeft: 2
			}),
			style: Window.DEFAULT_STYLE.extend({
				border: BORDER.DOUBLE
			}),
			label: " About ",
			children: [txtName, txtVersion, txtAuthor, txtDescription, btnSubmit],
			userClosable,
			onSelect: doSubmit,
			onClose: doClose
		});

		function doSubmit() {
			window.remove();
			if (onSubmit) {
				onSubmit();
			}
		}
		function doClose() {
			window.remove();
			if (onClose) {
				onClose();
			}
		}

		this.name = txtName;
		this.version = txtVersion;
		this.description = txtDescription;
		this.author = txtAuthor;
		this.button = btnSubmit;

		this.component = window;

		this.focus = this.focus.bind(this);
	}

	focus() {
		DeluxeCLI.focus(this.button);
	}
}
export default WindowPrompt;
