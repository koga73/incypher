const crypto = require("crypto");

module.exports = class CryptoProvider {
	static SYMMETRIC_ALGORITHM = "AES-256-GCM";
	static IV_LEN = 12; //Bytes
	static KEY_LEN = 32; //Bytes (32 * 8 = 256-bit)
	static TAG_LEN = 16; //Bytes (GCM hash tag)
	static HASH_ALGORITHM = "sha256";
	static ENCODING = "utf8";

	//cryptographically secure random number generation
	static random() {
		return crypto.randomBytes(4).readUInt32LE() / 0xffffffff;
	}

	static encrypt(iv, key, plaintext) {
		if (iv.byteLength != this.IV_LEN) {
			throw new Error("invalid iv length");
		}
		if (key.byteLength != this.KEY_LEN) {
			throw new Error("invalid key length");
		}
		const cipher = crypto.createCipheriv(this.SYMMETRIC_ALGORITHM, key, iv);
		const ciphertext = Buffer.concat([cipher.update(plaintext, this.ENCODING), cipher.final()]);
		const tag = cipher.getAuthTag();
		const encrypted = Buffer.concat([ciphertext, tag]).toString("base64");
		return encrypted;
	}

	static decrypt(iv, key, ciphertext) {
		if (iv.byteLength != this.IV_LEN) {
			throw new Error("invalid iv length");
		}
		if (key.byteLength != this.KEY_LEN) {
			throw new Error("invalid key length");
		}
		const encrypted = Buffer.from(ciphertext, "base64");
		const decipher = crypto.createDecipheriv(this.SYMMETRIC_ALGORITHM, key, iv);
		decipher.setAuthTag(encrypted.slice(-this.TAG_LEN));
		const decrypted = decipher.update(encrypted.slice(0, encrypted.length - this.TAG_LEN), "binary", this.ENCODING) + decipher.final(this.ENCODING);
		return decrypted;
	}

	static hash(phrase, optionalRawSalt) {
		optionalRawSalt = optionalRawSalt || null;

		let toHash = Buffer.from(phrase, this.ENCODING);
		if (optionalRawSalt) {
			toHash = Buffer.concat([optionalRawSalt, toHash]);
		}
		return new Uint8Array(crypto.createHash(this.HASH_ALGORITHM).update(toHash).digest().buffer);
	}

	static randomIV() {
		return crypto.randomBytes(this.IV_LEN);
	}

	//GCM MUST NOT REUSE IV WITH SAME KEY
	//Although GCM key length can be variable, 12-bit is recommended
	//NIST SP-800-38D: 8.2.1 Deterministic Construction
	//
	//startIV = random byte array of length 12
	//Fixed numerical value stays same per message
	//Incremental numerical value that changes per message (sequence number)
	static deterministicIV(startIV, fixed, incremental) {
		if (startIV.byteLength != this.IV_LEN) {
			throw new Error("invalid startIV length");
		}
		const nums = [];
		startIV = new Uint8Array(startIV);
		for (let i = 0; i < startIV.byteLength; i += 4) {
			let num = 0;
			num |= startIV[i] << 0;
			num |= startIV[i + 1] << 8;
			num |= startIV[i + 2] << 16;
			num |= startIV[i + 3] << 24;
			nums.push(num);
		}
		nums[0] ^= fixed;
		nums[1] ^= incremental;
		nums[2] ^= incremental;
		return new Uint8Array(new Uint32Array(nums).buffer);
	}

	//Hash the input and turn the first 4 bytes into a 32-bit number
	//This doesn"t need to be super unique as this value will get XOR"d with randomBytes
	//The output of this should be passed into deterministicIV "fixed" param
	static deterministic32BitVal(phrase) {
		const hash = this.hash(phrase);
		let fixedVal = 0;
		fixedVal |= hash[0] << 0;
		fixedVal |= hash[1] << 8;
		fixedVal |= hash[2] << 16;
		fixedVal |= hash[3] << 24;
		return fixedVal;
	}

	static byteArrayToHex(byteArray) {
		return Buffer.from(byteArray).toString("hex");
	}

	static hexToByteArray(hex) {
		return new Uint8Array(Buffer.from(hex, "hex"));
	}

	static atob(unencoded) {
		return Buffer.from(unencoded).toString("base64");
	}

	static btoa(base64Encoded) {
		return Buffer.from(base64Encoded, "base64").toString();
	}
};
