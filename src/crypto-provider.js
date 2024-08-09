import crypto from "crypto";

class _class {
	static SYMMETRIC_ALGORITHM = "AES-256-GCM";
	static IV_LEN = 12; //Bytes
	static KEY_LEN = 32; //Bytes (32 * 8 = 256-bit)
	static TAG_LEN = 16; //Bytes (GCM hash tag)
	static HASH_ALGORITHM = "sha256";
	static ENCODING_UTF8 = "utf8";

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
		const ciphertext = Buffer.concat([cipher.update(plaintext, "binary"), cipher.final()]);
		const tag = cipher.getAuthTag();
		const encrypted = Buffer.concat([ciphertext, tag]);
		return encrypted;
	}

	static decrypt(iv, key, ciphertext) {
		if (iv.byteLength != this.IV_LEN) {
			throw new Error("invalid iv length");
		}
		if (key.byteLength != this.KEY_LEN) {
			throw new Error("invalid key length");
		}
		const encrypted = Buffer.from(ciphertext);
		const decipher = crypto.createDecipheriv(this.SYMMETRIC_ALGORITHM, key, iv);
		decipher.setAuthTag(encrypted.subarray(-this.TAG_LEN));
		const decrypted = Buffer.concat([decipher.update(encrypted.subarray(0, encrypted.length - this.TAG_LEN), "binary"), decipher.final()]);
		return decrypted;
	}

	static hash(input, salt = null, algorithm = this.HASH_ALGORITHM) {
		if (isString(input)) {
			input = Buffer.from(input, this.ENCODING_UTF8);
		}
		if (isString(salt)) {
			salt = Buffer.from(salt, this.ENCODING_UTF8);
		}
		let toHash = input;
		if (salt) {
			toHash = Buffer.concat([input, salt]);
		}
		return new Uint8Array(crypto.createHash(algorithm).update(toHash).digest().buffer);
	}

	//NIST SP 800-132 recommends the salt is at least 16-bytes long
	static hashPass(pass, salt, length = this.KEY_LEN) {
		return new Promise((resolve, reject) => {
			crypto.scrypt(pass, salt, length, (err, derivedKey) => {
				if (err) reject(err);
				resolve(derivedKey);
			});
		});
	}

	static randomIV() {
		return _class.randomBytes(this.IV_LEN);
	}

	static randomBytes(length) {
		return crypto.randomBytes(length);
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
		//GCM recommends first byte be fixed and last two dynamic per message
		nums[0] ^= fixed;
		nums[1] ^= incremental;
		nums[2] ^= incremental;
		return new Uint8Array(new Uint32Array(nums).buffer);
	}

	//Hash the input and turn the first 4 bytes into a 32-bit number
	//This doesn"t need to be super unique as this value will get XOR"d with randomBytes
	//The output of this should be passed into deterministicIV "fixed" param
	static deterministic32BitVal(input) {
		const hash = this.hash(input);
		let fixedVal = 0;
		fixedVal |= hash[0] << 0;
		fixedVal |= hash[1] << 8;
		fixedVal |= hash[2] << 16;
		fixedVal |= hash[3] << 24;
		return fixedVal;
	}
}
export default _class;

function isString(str) {
	return typeof str === typeof "";
}
