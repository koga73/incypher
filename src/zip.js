class _class {
	constructor(options) {
		this.options = options;
	}

	store(key, value) {
		console.log("Incypher::store", key, value);
	}
}
module.exports = _class;
