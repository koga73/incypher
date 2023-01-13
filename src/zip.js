//Lib imports
const JSZip = require("jszip");

//Local imports
const Utils = require("./utils");

class _class {
	constructor(config) {
		this.config = config;
		this.zip = new JSZip();
	}

	store(key, value) {
		if (this.config.debug) {
			console.info("zip::store", key, value);
		}
		this.zip.file(Utils.ensureExtension(key), value);
	}

	retrieve(key, type = "string") {
		if (this.config.debug) {
			console.info("zip::retrieve", key, type);
		}
		const file = this.zip.file(Utils.ensureExtension(key));
		if (file) {
			return file.async(type);
		}
		return null;
	}

	list() {
		if (this.config.debug) {
			console.info("zip::list");
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
		if (this.config.debug) {
			console.info("zip::delete", key);
		}
		return this.zip.remove(Utils.ensureExtension(key));
	}

	setStream(stream) {
		if (this.config.debug) {
			console.info("zip::setStream");
		}
		return this.zip.loadAsync(stream);
	}
	getStream() {
		if (this.config.debug) {
			console.info("zip::getStream");
		}
		return this.zip.generateAsync({type: "nodebuffer"});
	}
}
module.exports = _class;
