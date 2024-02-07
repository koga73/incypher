import DeluxeCLI, {Window, Input, Button, Text, ORIGIN, BORDER} from "deluxe-cli";

class WindowPrompt {
	constructor({
		id,
		windowLabel = "",
		windowLabelOriginX = ORIGIN.X.LEFT,
		userClosable = true,
		heading = "",
		inputLabel = "",
		inputMask = null,
		btnValue = "Submit",
		onSubmit = null,
		onClose = null
	}) {
		let input = "";

		const txtHeading = new Text({
			id: `${id}_heading`,
			value: heading,
			position: Text.DEFAULT_POSITION.extend({
				width: "100%",
				marginBottom: 1
			})
		});
		const inputUser = new Input({
			id: `${id}_input`,
			position: Input.DEFAULT_POSITION.extend({
				labelOriginX: ORIGIN.X.LEFT,
				marginBottom: 3
			}),
			label: inputLabel,
			mask: inputMask,
			onChange: (value) => {
				input = value;
			}
		});
		const btnSubmit = new Button({
			id: `${id}_btn`,
			position: Button.DEFAULT_POSITION.extend({
				marginTop: 1,
				marginBottom: 1
			}),
			value: btnValue,
			onSelect: doSubmit
		});
		const window = new Window({
			id,
			position: Window.DEFAULT_POSITION.extend({
				originX: ORIGIN.X.CENTER,
				originY: ORIGIN.Y.CENTER,
				labelOriginX: windowLabelOriginX,
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
			label: windowLabel,
			children: [txtHeading, inputUser, btnSubmit],
			userClosable,
			onSelect: doSubmit,
			onClose: doClose
		});

		function doSubmit() {
			window.remove();
			if (onSubmit) {
				onSubmit(input);
			}
		}
		function doClose() {
			window.remove();
			if (onClose) {
				onClose();
			}
		}

		this.heading = txtHeading;
		this.input = inputUser;
		this.button = btnSubmit;
		this.window = window;

		this.component = window;

		this.focus = this.focus.bind(this);
	}

	focus() {
		DeluxeCLI.focus(this.input);
	}
}
export default WindowPrompt;
