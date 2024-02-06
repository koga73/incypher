//Lib imports
import JSZip from "jszip";

//Local imports
import Utils from "./utils.js";

class _class {
	constructor(config) {
		this.config = config;
		this.zip = new JSZip();

		this.store = this.store.bind(this);
		this.retrieve = this.retrieve.bind(this);
		this.list = this.list.bind(this);
		this.delete = this.delete.bind(this);
		this.setStream = this.setStream.bind(this);
		this.getStream = this.getStream.bind(this);
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
export default _class;
