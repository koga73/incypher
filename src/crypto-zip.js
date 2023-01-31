//Node imports
const {promises: fs} = require("fs");
const path = require("path");

//Node imports
const Zip = require("./zip");
const CryptoProvider = require("./crypto-provider");
const Utils = require("./utils");

//Local imports
const {name: packageName, version: packageVersion, author: packageAuthor} = require("../package.json");

//Header data constants
const FILE_MESSAGE = `encrypted with ${packageName} ${Utils.getFixedVersion(packageVersion)} \n`;

const INCREMENTAL_BUFFER_LEN = 4; //Bytes
const SALT_BUFFER_LEN = 16; //Bytes
const HEADER_SIZE = FILE_MESSAGE.length + CryptoProvider.IV_LEN + INCREMENTAL_BUFFER_LEN + SALT_BUFFER_LEN;

//https://regex101.com/r/ajzODa/2
const FILE_MESSAGE_REGEX = /^(.+?)\d+[\s\S]*$/;

class _class extends Zip {
	constructor(config) {
		super(config);

		this.currentIncrement = (CryptoProvider.random() * 0xffff) >> 0; //Start with a random increment
		this.content = "";
		this.isEncrypted = false;
	}

	async load(filePath) {
		if (this.config.debug) {
			console.info("crypto-zip::load", filePath);
		}
		if (!(await Utils.fsExists(filePath))) {
			return;
		}
		const content = await fs.readFile(filePath);
		this.isEncrypted = _isEncrypted(content);
		this.content = content;
	}

	async save(filePath) {
		if (this.config.debug) {
			console.info("crypto-zip::save", filePath);
		}
		const content = this.content;
		await fs.writeFile(filePath, content);
		if (this.config.backup) {
			const now = new Date();
			const timestamp = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_at_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
			await fs.writeFile(path.join(this.config.defaultDir, `store-backup_${timestamp}.${packageName}`), content);
		}
	}

	async decrypt(passphrase) {
		if (this.config.debug) {
			console.info("crypto-zip::decrypt");
		}
		const content = this.content;
		if (!(content && content.length)) {
			return;
		}
		if (!this.isEncrypted) {
			await this.setStream(content);
			return;
		} else if (!(passphrase && passphrase != "")) {
			throw new Error(`Could not decrypt - passphrase required`);
		}
		const {startIV, incremental, salt} = _parseHeader(content.subarray(0, HEADER_SIZE));
		const ciphertext = content.subarray(HEADER_SIZE);
		const fixed = CryptoProvider.deterministic32BitVal(packageAuthor.name);
		const deterministicIV = CryptoProvider.deterministicIV(startIV, fixed, incremental);
		const key = await CryptoProvider.hashPass(passphrase, salt);
		try {
			const plaintext = CryptoProvider.decrypt(deterministicIV, key, ciphertext);
			this.currentIncrement = incremental;
			await this.setStream(plaintext);
		} catch (err) {
			throw new Error(`Could not decrypt - ${err.message}`);
		}
	}

	//Encrypts file with passphrase
	//A 12-byte initial IV (Initialization Vector) is generated via a cryptographically secure random bytes generator and is written to the file header
	//A 32-bit currentIncrement value starts at random (0-65535) and increments once each time we encrypt and is written to the file header
	//A deterministic IV is constructed via the starting IV, a fixed value and the currentIncrement value
	//The deterministic IV function follows NIST SP-800-38D: 8.2.1 Deterministic Construction
	//This ensures that we do not reuse the same IV and it cannot be predicted per AES-GCM specifications
	//A 16-byte random salt is generated via a cryptographically secure random bytes generator and is written to the file header
	//The random salt is then combined with the user passphrase and hashed via scrypt to generate the 256-bit encryption key
	//Encryption takes place using AES-256-GCM and the GCM integrity tag is appended to the end of the ciphertext
	async encrypt(passphrase) {
		if (this.config.debug) {
			console.info("crypto-zip::encrypt");
		}
		const stream = await this.getStream();
		if (!(stream && stream.length)) {
			this.content = "";
			return;
		}
		if (!(passphrase && passphrase != "")) {
			this.content = stream;
			return;
		}
		const startIV = CryptoProvider.randomIV();
		const fixed = CryptoProvider.deterministic32BitVal(packageAuthor.name);
		const incremental = this.currentIncrement + 1;
		const deterministicIV = CryptoProvider.deterministicIV(startIV, fixed, incremental);
		const salt = CryptoProvider.randomBytes(SALT_BUFFER_LEN);
		const key = await CryptoProvider.hashPass(passphrase, salt);
		try {
			const ciphertext = CryptoProvider.encrypt(deterministicIV, key, stream);
			this.content = Buffer.concat([_generateHeader(startIV, incremental, salt), ciphertext]);
		} catch (err) {
			throw new Error(`Could not encrypt - ${err.message}`);
		}
	}
}
module.exports = _class;

//Determine if file content is encrypted
function _isEncrypted(content) {
	if (content.length < HEADER_SIZE) {
		return false;
	}
	const fileMessage = content.subarray(0, FILE_MESSAGE.length).toString(CryptoProvider.ENCODING);
	return FILE_MESSAGE.replace(FILE_MESSAGE_REGEX, "$1") == fileMessage.replace(FILE_MESSAGE_REGEX, "$1");
}

function _generateHeader(startIV, incremental, salt) {
	const incrementalBuffer = Buffer.alloc(INCREMENTAL_BUFFER_LEN);
	incrementalBuffer.writeUint32BE(incremental);
	return Buffer.concat([Buffer.from(FILE_MESSAGE, CryptoProvider.ENCODING), startIV, incrementalBuffer, salt]);
}

function _parseHeader(header) {
	const incrementalBuffer = header.subarray(FILE_MESSAGE.length + CryptoProvider.IV_LEN, FILE_MESSAGE.length + CryptoProvider.IV_LEN + INCREMENTAL_BUFFER_LEN);
	return {
		fileMessage: header.subarray(0, FILE_MESSAGE.length),
		startIV: header.subarray(FILE_MESSAGE.length, FILE_MESSAGE.length + CryptoProvider.IV_LEN),
		incremental: parseInt(incrementalBuffer.toString("hex"), 16),
		salt: header.subarray(FILE_MESSAGE.length + CryptoProvider.IV_LEN + INCREMENTAL_BUFFER_LEN, HEADER_SIZE)
	};
}
