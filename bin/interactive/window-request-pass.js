import DeluxeCLI, {Window, Input, Button, Text, ORIGIN, BORDER} from "deluxe-cli";

class WindowRequestPass {
	constructor({onSubmit}) {
		let decryptPass = "";

		function doSubmit() {
			windowDecrypt.remove();
			onSubmit(decryptPass);
		}

		const txtExistingPassHeading = new Text({
			id: "txtExistingPassHeading",
			value: "Enter the passphrase to decrypt the keystore.",
			position: Text.DEFAULT_POSITION.extend({
				width: "100%"
			})
		});
		const inputExistingPass = new Input({
			id: "inputExistingPass",
			position: Input.DEFAULT_POSITION.extend({
				originX: ORIGIN.X.CENTER,
				originY: ORIGIN.Y.CENTER,
				labelOriginX: ORIGIN.X.LEFT
			}),
			label: " Passphrase ",
			mask: Input.DEFAULT_MASK,
			onChange: (value) => {
				decryptPass = value;
			}
		});
		const btnDecrypt = new Button({
			id: "btnDecrypt",
			position: Button.DEFAULT_POSITION.extend({
				marginTop: 1,
				marginBottom: 1
			}),
			value: "Decrypt",
			onSelect: doSubmit
		});
		const windowDecrypt = new Window({
			id: "windowDecrypt",
			position: Window.DEFAULT_POSITION.extend({
				labelOriginX: ORIGIN.X.CENTER,
				width: "100%",
				paddingTop: 1,
				paddingRight: 2,
				paddingBottom: 1,
				paddingLeft: 2
			}),
			style: Window.DEFAULT_STYLE.extend({
				border: BORDER.DOUBLE
			}),
			label: " - ENCRYPTED - ",
			children: [txtExistingPassHeading, inputExistingPass, btnDecrypt],
			onSelect: doSubmit
		});

		this.inputExistingPass = inputExistingPass;
		this.component = windowDecrypt;

		this.focus = this.focus.bind(this);
	}

	focus() {
		DeluxeCLI.focus(this.inputExistingPass);
	}
}
export default WindowRequestPass;
