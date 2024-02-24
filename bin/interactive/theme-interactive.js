import {Theme, Style, BORDER, COLORS} from "deluxe-cli";

class ThemeInteractive extends Theme {
	static COLORS = {
		LABEL: COLORS.FG.CYAN,
		TEXT: COLORS.FG.WHITE
	};

	static DEFAULT_MAP = {
		Screen: new Style({
			backgroundColor: COLORS.BG.BLACK,
			color: COLORS.FG.WHITE,
			borderColor: COLORS.FG.MAGENTA,
			labelColor: COLORS.FG.CYAN
		}),
		Window: new Style({
			border: BORDER.DOUBLE,
			backgroundColor: COLORS.BG.BLACK,
			color: COLORS.FG.WHITE,
			borderColor: COLORS.FG.MAGENTA,
			labelColor: COLORS.FG.CYAN
		}),
		Text: new Style({
			color: COLORS.FG.WHITE
		}),
		Input: new Style({
			border: BORDER.SINGLE,
			color: COLORS.FG.WHITE,
			borderColor: COLORS.FG.WHITE,
			labelColor: COLORS.FG.WHITE
		}),
		Button: new Style({
			border: BORDER.SINGLE,
			color: COLORS.FG.WHITE,
			borderColor: COLORS.FG.WHITE
		}),
		List: new Style({
			border: BORDER.SINGLE,
			borderColor: COLORS.FG.MAGENTA,
			labelColor: COLORS.FG.CYAN,
			selectedBackgroundColor: COLORS.BG.BLACK,
			selectedColor: COLORS.FG.WHITE,
			selectedUnderline: true,
			activeBackgroundColor: COLORS.BG.YELLOW_BRIGHT,
			activeColor: COLORS.FG.BLACK,
			activeUnderline: false
		}),
		ScrollBar: new Style({
			border: BORDER.SINGLE,
			trackCharacter: String.fromCharCode(0x2592),
			trackColor: COLORS.FG.WHITE,
			thumbCharacter: String.fromCharCode(0x2588),
			thumbColor: COLORS.FG.WHITE
		}),

		txtStatus: new Style({
			color: COLORS.FG.CYAN
		}),
		windowPass: new Style({
			border: BORDER.DOUBLE,
			backgroundColor: COLORS.BG.RED,
			color: COLORS.FG.BLACK,
			borderColor: COLORS.FG.WHITE,
			labelColor: COLORS.FG.WHITE
		})
	};

	static DEFAULT_FOCUS_MAP = {
		Input: new Style({
			border: BORDER.SINGLE,
			backgroundColor: COLORS.BG.WHITE,
			color: COLORS.FG.BLACK,
			borderBackgroundColor: COLORS.BG.WHITE,
			borderColor: COLORS.FG.BLACK
		}),
		Button: new Style({
			border: BORDER.SINGLE,
			backgroundColor: COLORS.BG.WHITE,
			color: COLORS.FG.BLACK
		})
	};

	constructor(map = ThemeInteractive.DEFAULT_MAP, focusMap = ThemeInteractive.DEFAULT_FOCUS_MAP) {
		super(map, focusMap);
	}
}
export default ThemeInteractive;
