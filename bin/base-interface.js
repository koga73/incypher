//Node imports
import {promises as fs} from "fs";
import path from "path";
import childProcess from "child_process";

//Local imports
import CryptoZip from "../src/crypto-zip.js";
import CryptoProvider from "../src/crypto-provider.js";
import Utils from "../src/utils.js";

class _class {
	constructor(config, {defaultDir, configFile}) {
		this.config = config;
		this.defaultDir = defaultDir;
		this.configFile = configFile;
		this.filePath = config.store;

		this.logger = console;

		this.store = this.store.bind(this);
		this.view = this.view.bind(this);
		this.open = this.open.bind(this);
		this.list = this.list.bind(this);
		this.delete = this.delete.bind(this);
		this.import = this.import.bind(this);
		this.export = this.export.bind(this);
		this.password = this.password.bind(this);
		this.erase = this.erase.bind(this);
		this.nuke = this.nuke.bind(this);
		this.openConfig = this.openConfig.bind(this);

		this._readStore = this._readStore.bind(this);
		this._writeStore = this._writeStore.bind(this);
		this._secureErase = this._secureErase.bind(this);
		this._execChildProcess = this._execChildProcess.bind(this);

		this._prompt = this._prompt.bind(this);
		this._promptPassExisting = this._promptPassExisting.bind(this);
		this._promptPassNew = this._promptPassNew.bind(this);

		this.zip = new CryptoZip(
			{
				debug: config.debug,
				backup: config.backup,
				defaultDir: defaultDir
			},
			this.logger
		);
	}

	async store(key, value) {
		const {zip, logger, _readStore, _writeStore} = this;

		const pass = await _readStore();
		logger.log("STORE", key);
		zip.store(key, value);
		await _writeStore(pass);
	}

	async view(key) {
		const {zip, logger, _readStore} = this;

		await _readStore();
		logger.log("VIEW", key);
		logger.log("");
		const content = await zip.retrieve(key);
		if (content !== null) {
			logger.log("   ", content);
		} else {
			logger.log("   ", `--- not found ---`);
		}
		return content;
	}

	async open(key) {
		const {zip, logger, defaultDir, _readStore, _secureErase} = this;

		const file = path.parse(key).base;
		const fileName = path.join(defaultDir, Utils.ensureExtension(file));

		await _readStore();
		logger.log("OPEN", key);
		const content = await zip.retrieve(key, "uint8array");
		if (content) {
			await fs.writeFile(fileName, content);
			childProcess.execSync(fileName);
			logger.log("ERASE", fileName);
			await _secureErase(fileName);
		} else {
			logger.log("");
			logger.log("   ", `--- not found ---`);
		}
	}

	async list() {
		const {zip, logger, _readStore} = this;

		await _readStore();
		logger.log("LIST");
		logger.log("");
		const list = zip.list();
		list.map((entry) => logger.log("   ", entry));
		return list;
	}

	async delete(key) {
		const {zip, logger, _readStore, _writeStore} = this;

		const pass = await _readStore();
		logger.log("DELETE", key);
		const content = await zip.retrieve(key);
		if (content) {
			zip.delete(key);
			await _writeStore(pass);
		} else {
			logger.log("");
			logger.log("   ", `--- not found ---`);
		}
	}

	async import(file, key) {
		const {zip, logger, _readStore, _writeStore} = this;

		const content = await fs.readFile(file);
		const pass = await _readStore();
		logger.log("IMPORT", key);
		zip.store(key, content);
		await _writeStore(pass);
	}

	async importMany(files) {
		const {zip, logger, _readStore, _writeStore} = this;

		const pass = await _readStore();
		const filesLen = files.length;
		for (let i = 0; i < filesLen; i++) {
			const file = files[i];
			if (await Utils.fsExists(file)) {
				const stat = await fs.stat(file);
				if (stat.isDirectory()) {
					logger.warn("WARN: Import of directories is not yet supported");
				} else {
					const key = path.parse(file).base;
					const content = await fs.readFile(file);
					logger.log("IMPORT", file);
					zip.store(key, content);
				}
			}
		}
		await _writeStore(pass);
	}

	async export(key, file) {
		const {zip, logger, _readStore} = this;

		const fileName = Utils.ensureExtension(file);
		await _readStore();
		logger.log("EXPORT", key);
		const content = await zip.retrieve(key, "uint8array");
		if (content) {
			await fs.writeFile(fileName, content);
		} else {
			logger.log("");
			logger.log("   ", `--- not found ---`);
		}
	}

	async password() {
		const {_readStore, _writeStore} = this;

		await _readStore();
		await _writeStore();
	}

	async erase(file) {
		const {logger, _secureErase} = this;

		logger.log("ERASE", file);
		await _secureErase(file);
	}

	async nuke() {
		const {defaultDir, filePath, logger, _secureErase} = this;

		if (await Utils.fsExists(filePath)) {
			logger.log("ERASE", filePath);
			await _secureErase(filePath);
		}
		if (await Utils.fsExists(defaultDir)) {
			const nukeFiles = await fs.readdir(defaultDir);
			await Promise.all(
				nukeFiles.map((fileName) => {
					const filePath = path.join(defaultDir, fileName);
					logger.log("ERASE", filePath);
					return _secureErase(filePath);
				})
			);
			logger.log("DELETE", defaultDir);
			await fs.rmdir(defaultDir);
		}
	}

	openConfig() {
		const {configFile, logger} = this;

		logger.log("OPEN", configFile);
		childProcess.execSync(configFile);
	}

	async _readStore() {
		const {zip, filePath, config, logger, _promptPassExisting, _execChildProcess} = this;

		if (config.sync.enabled) {
			logger.log("SYNC DOWNLOAD");
			if (config.debug) {
				logger.log(config.sync.download);
			}

			try {
				_execChildProcess(config.sync.download);
			} catch (err) {
				throw new Error("Sync download command failed");
			}
		}

		logger.log("READ", filePath);
		const success = await zip.load(filePath);

		let pass = null;
		try {
			pass = success ? (zip.isEncrypted ? await _promptPassExisting() : "") : null;
			await zip.decrypt(pass);
		} catch (err) {
			logger.error(err);
			throw new Error("Failed to decrypt keystore");
		}

		return pass;
	}

	async _writeStore(pass = null) {
		const {zip, filePath, config, logger, _promptPassNew, _execChildProcess} = this;

		try {
			await zip.encrypt(pass !== null ? pass : await _promptPassNew());
		} catch (err) {
			logger.error(err);
			throw new Error("Failed to encrypt keystore");
		}

		logger.log("WRITE", filePath);
		await zip.save(filePath);

		if (config.sync.enabled) {
			logger.log("SYNC UPLOAD");
			if (config.debug) {
				logger.log(config.sync.upload);
			}
			try {
				_execChildProcess(config.sync.upload);
			} catch (err) {
				throw new Error("Sync upload command failed");
			}
		}
	}

	async _secureErase(filePath) {
		const stat = await fs.stat(filePath);
		if (stat.isDirectory()) {
			throw new Error("Secure erasure of directories is not supported");
		}
		if (!stat.size) {
			return;
		}
		await fs.writeFile(filePath, CryptoProvider.randomBytes(stat.size));
		await fs.rm(filePath);
	}

	_execChildProcess(command) {
		childProcess.execSync(command);
	}

	_prompt(question, options) {
		throw new Error("_prompt - Not implemented");
	}

	async _promptPassExisting(options) {
		throw new Error("_promptPassExisting - Not implemented");
	}

	async _promptPassNew(options) {
		throw new Error("_promptPassNew - Not implemented");
	}

	async execute(args) {
		throw new Error("execute - Not implemented");
	}
}
export default _class;
