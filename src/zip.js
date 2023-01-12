const JSZip = require("jszip");

class _class {
	constructor({debug = false}) {
		this.debug = debug;
		this.zip = new JSZip();
	}

	store(key, value) {
		if (this.debug) {
			console.log("zip::store", key, value);
		}
		this.zip.file(this.ensureExtension(key), value);
	}

	retrieve(key, type = "string") {
		if (this.debug) {
			console.log("zip::retrieve", key, type);
		}
		return this.zip.file(this.ensureExtension(key)).async(type);
	}

	list() {
		if (this.debug) {
			console.log("zip::list");
		}
		const entries = [];
		this.zip.forEach((key, info) => {
			if (!info.dir) {
				//Remove txt file extension
				const entry = key.replace(/\.txt$/, "");
				entries.push(entry);
			}
		});
		entries.sort();
		return entries;
	}

	delete(key) {
		if (this.debug) {
			console.log("zip::delete", key);
		}
		return this.zip.remove(this.ensureExtension(key));
	}

	setStream(stream) {
		if (this.debug) {
			console.log("zip::setStream");
		}
		return this.zip.loadAsync(stream);
	}
	getStream() {
		if (this.debug) {
			console.log("zip::getStream");
		}
		return this.zip.generateAsync({type: "nodebuffer"});
	}

	//Ensure our fileName has a file extension
	ensureExtension(fileName) {
		if (!/\..+$/.test(fileName)) {
			return `${fileName}.txt`;
		}
		return fileName;
	}
}
module.exports = _class;
