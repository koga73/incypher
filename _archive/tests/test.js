#!/usr/bin/env node

//This file contains unit tests for NodeJS

const expect = require("chai").expect;

const InCypher = require("../dist/NodeCryptoProvider.js");

const testPhrase = "The quick brown fox jumps over the lazy dog";

describe("--- CryptoProvider ---\n", function () {
	it("random", function () {
		const val = InCypher.random();
		expect(val).gte(0).lte(1);
	});
	it("encrypt", function () {
		const startIV = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10, 0x11, 0x12]);
		const fixed = InCypher.deterministic32BitVal("fixedPhrase");
		const incremental = 73;
		const deterministicIV = InCypher.deterministicIV(startIV, fixed, incremental);
		const key = InCypher.hash("mySecretKey");
		const ciphertext = InCypher.btoa(InCypher.encrypt(deterministicIV, key, testPhrase));
		expect(ciphertext).equal("S1Evemh0bEZSa0RTbXUvYWRBME5zeDFGWFRwRzlGL2piZmZrcmVHOFU2aWFzUFlTT3lDWVdMWC82YnB1azJqOVZnV01TOWc0bmJVSURnUT0=");
	});
	it("decrypt", function () {
		const startIV = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10, 0x11, 0x12]);
		const fixed = InCypher.deterministic32BitVal("fixedPhrase");
		const incremental = 73;
		const deterministicIV = InCypher.deterministicIV(startIV, fixed, incremental);
		const key = InCypher.hash("mySecretKey");
		const ciphertext = InCypher.atob("S1Evemh0bEZSa0RTbXUvYWRBME5zeDFGWFRwRzlGL2piZmZrcmVHOFU2aWFzUFlTT3lDWVdMWC82YnB1azJqOVZnV01TOWc0bmJVSURnUT0=");
		const plaintext = InCypher.decrypt(deterministicIV, key, ciphertext);
		expect(plaintext).equal(testPhrase);
	});
	it("hash | SHA-256", function () {
		const hash = InCypher.arrayBufferToHex(InCypher.hash(testPhrase));
		expect(hash).equal("d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592");
	});
	it("randomIV", function () {
		const randomIV = InCypher.randomIV();
		expect(randomIV.byteLength).equal(InCypher.IV_LEN);
	});
	it("deterministicIV", function () {
		const startIV = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10, 0x11, 0x12]);
		const fixed = InCypher.deterministic32BitVal("fixedPhrase");
		const incremental = 73;
		const deterministicIV = InCypher.arrayBufferToHex(InCypher.deterministicIV(startIV, fixed, incremental));
		expect(deterministicIV).equal("1f1a7cde4c06070840101112");
	});
	it("deterministic32BitVal", function () {
		const fixedIV = InCypher.deterministic32BitVal(testPhrase);
		expect(fixedIV).equal(-1275352873);
	});
	it("arrayBufferToHex", function () {
		const hex = InCypher.arrayBufferToHex(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
		expect(hex).equal("01020304");
	});
	it("hexToArrayBuffer", function () {
		const byteArray = InCypher.hexToArrayBuffer("01020304");
		expect(byteArray[0]).equal(0x01);
		expect(byteArray[1]).equal(0x02);
		expect(byteArray[2]).equal(0x03);
		expect(byteArray[3]).equal(0x04);
	});
	it("atob", function () {
		const base64Encoded = InCypher.btoa(testPhrase);
		expect(base64Encoded).equal("VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIHRoZSBsYXp5IGRvZw==");
	});
	it("btoa", function () {
		const unencoded = InCypher.atob("VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIHRoZSBsYXp5IGRvZw");
		expect(unencoded).equal(testPhrase);
	});
});
