import DeluxeCLI, {Window, Button, Text, ORIGIN, BORDER} from "deluxe-cli";

import ThemeInteractive from "./theme-interactive.js";

class WindowView {
	constructor({id, heading, content, userClosable = true, onSubmit = null, onClose = null}) {
		const txtContent = new Text({
			id: `${id}_content`,
			label: ` ${heading} `,
			value: content,
			position: Text.DEFAULT_POSITION.extend({
				originX: ORIGIN.X.CENTER, //Center the text horizontally
				originY: ORIGIN.Y.CENTER, //Center the text vertically
				labelOriginX: ORIGIN.X.LEFT,
				paddingTop: 1,
				paddingRight: 3,
				paddingBottom: 1,
				paddingLeft: 3,
				width: content.length + 6 + 2,
				height: 5
			})
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
			label: ` View `,
			children: [txtContent, btnSubmit],
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

		this.content = txtContent;
		this.button = btnSubmit;

		this.component = window;

		this.focus = this.focus.bind(this);
	}

	focus() {
		DeluxeCLI.focus(this.button);
	}
}
export default WindowView;
