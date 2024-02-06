#!/usr/bin/env node

//Node imports
import fsRaw from "fs";
import {promises as fs, constants as fs_constants} from "fs";
import path from "path";
import childProcess from "child_process";
import {homedir} from "os";

//Local imports
import Interactive from "./interactive.js";
import Args from "./args.js";
import CryptoProvider from "../src/crypto-provider.js";
import Utils from "../src/utils.js";

//package.json
import packageJson from "../package.json" assert {type: "json"};
const {name: packageName, version: packageVersion, author: packageAuthor} = packageJson;

const homeDir = process.env["INCYPHER_HOME"] || homedir();

//Portable mode?
const PORTABLE_DIR = path.join(process.cwd(), `.${packageName}`);
const PORTABLE_MODE = fsRaw.existsSync(PORTABLE_DIR);

//File constants
const DEFAULT_DIR = PORTABLE_MODE ? PORTABLE_DIR : path.join(homeDir, `.${packageName}`);
const CONFIG_FILE = path.join(DEFAULT_DIR, `${packageName}-config.json`);
const CONFIG = {
	name: packageName,
	author: packageAuthor,
	version: packageVersion,
	debug: false,
	backup: PORTABLE_MODE ? false : true,
	store: PORTABLE_MODE ? path.join(`.${packageName}`, `store.${packageName}`) : path.join(DEFAULT_DIR, `store.${packageName}`),
	sync: {
		enabled: false,
		init: `rclone mkdir remote:${packageName}`,
		upload: `rclone copy "${DEFAULT_DIR}" remote:${packageName} --include "*.${packageName}" -v --progress`,
		download: `rclone copy remote:${packageName} "${DEFAULT_DIR}" --include "*.${packageName}" -v --progress`
	}
};

async function _initialize() {
	//Check home directory access
	const isHomeDirAccessible = await fs.access(homeDir, fs_constants.R_OK | fs_constants.W_OK);
	if (isHomeDirAccessible) {
		throw new Error(`${homeDir} is not accessible`);
	}

	//Create directory if needed
	if (!(await Utils.fsExists(DEFAULT_DIR))) {
		await fs.mkdir(DEFAULT_DIR);
		console.log("MKDIR", DEFAULT_DIR);
	}
	//Create config if needed
	if (!(await Utils.fsExists(CONFIG_FILE))) {
		const fileStore = ""; //await _prompt(`File store (leave empty for default: ${CONFIG.store})`);
		const configData = {
			store: fileStore != "" ? fileStore : CONFIG.FILE_STORE,
			...CONFIG
		};
		console.log("WRITE", CONFIG_FILE);
		await fs.writeFile(CONFIG_FILE, JSON.stringify(configData, null, 4));
	}

	//Read config
	const config = JSON.parse(await fs.readFile(CONFIG_FILE));

	//Check file access
	const isFileAccessible = await fs.access(path.dirname(config.store), fs_constants.R_OK | fs_constants.W_OK);
	if (isFileAccessible) {
		throw new Error(`${config.store} is not accessible`);
	}

	//Check sync access
	if (config.sync.enabled) {
		if (config.debug) {
			console.log("SYNC ENABLED");
		}
		try {
			childProcess.execSync(config.sync.init);
		} catch (err) {
			throw new Error("Sync init command failed");
		}
	}

	return config;
}

async function _secureErase(filePath) {
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

async function _readStore(filePath, zip, config, requestPassFunc) {
	if (config.sync.enabled) {
		console.log("SYNC DOWNLOAD");
		if (config.debug) {
			console.log(config.sync.download);
		}
		try {
			childProcess.execSync(config.sync.download);
		} catch (err) {
			throw new Error("Sync download command failed");
		}
	}

	console.log("READ", filePath);
	const success = await zip.load(filePath);
	const pass = success ? await requestPassFunc(zip) : null;
	await zip.decrypt(pass);

	return pass;
}

async function _writeStore(filePath, zip, pass, config, resolvePassFunc) {
	await zip.encrypt(await resolvePassFunc(pass));

	console.log("WRITE", filePath);
	await zip.save(filePath);

	if (config.sync.enabled) {
		console.log("SYNC UPLOAD");
		if (config.debug) {
			console.log(config.sync.upload);
		}
		try {
			childProcess.execSync(config.sync.upload);
		} catch (err) {
			throw new Error("Sync upload command failed");
		}
	}
}

(async function execute() {
	var result = 0;

	console.log("");
	console.log(`${packageName} ${packageVersion}`);
	console.log("");
	if (PORTABLE_MODE) {
		console.log(`PORTABLE MODE`);
	}

	const args = process.argv.splice(2);
	const argsLen = args.length;
	let config = CONFIG;

	try {
		config = await _initialize();

		if (argsLen >= 1) {
			result = await Args.run(args, config, {defaultDir: DEFAULT_DIR, configFile: CONFIG_FILE}, {readStore: _readStore, writeStore: _writeStore, secureErase: _secureErase});
		} else {
			result = await Interactive.run(
				args,
				config,
				{defaultDir: DEFAULT_DIR, configFile: CONFIG_FILE},
				{readStore: _readStore, writeStore: _writeStore, secureErase: _secureErase}
			);
		}
	} catch (err) {
		if (config.debug) {
			console.error(err);
		} else {
			console.error(`ERROR: ${err.message}`);
		}
		result = 1;
	} finally {
		console.log("");
		process.exit(result);
	}
})();
