(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.BrowserCryptoProvider = mod.exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.CryptoProvider = void 0;

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  var crypto = window.crypto || window.msCrypto || null;

  var CryptoProvider = /*#__PURE__*/function () {
    function CryptoProvider() {
      _classCallCheck(this, CryptoProvider);
    }

    _createClass(CryptoProvider, null, [{
      key: "getCrypto",
      //Bytes
      //Bytes (32 * 8 = 256-bit)
      //Bytes (GCM hash tag)
      value: function getCrypto() {
        return crypto;
      }
    }, {
      key: "isSupported",
      value: function isSupported() {
        return crypto !== null;
      } //Cryptographically secure random number generation
      //https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues

    }, {
      key: "random",
      value: function random() {
        return crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff;
      } //Returns promise

    }, {
      key: "loadKeySymmetric",
      value: function loadKeySymmetric(arrayBuffer) {
        //Fourth parameter "false" means the key is not extractable
        return crypto.subtle.importKey("raw", arrayBuffer, this.SYMMETRIC_ALGORITHM, false, ["encrypt", "decrypt"]);
      } //Returns promise

    }, {
      key: "encrypt",
      value: function encrypt(iv, key, plaintext) {
        if (iv.byteLength != this.IV_LEN) {
          throw new Error("invalid iv length");
        }

        if (key && key.algorithm && key.algorithm.length / 8 != this.KEY_LEN) {
          throw new Error("invalid key length");
        }

        if (typeof plaintext === "string") {
          plaintext = new TextEncoder().encode(plaintext);
        }

        return crypto.subtle.encrypt({
          name: this.SYMMETRIC_ALGORITHM,
          iv: iv
        }, key, plaintext);
      } //Returns promise

    }, {
      key: "decrypt",
      value: function decrypt(iv, key, ciphertext) {
        if (iv.byteLength != this.IV_LEN) {
          throw new Error("invalid iv length");
        }

        if (key && key.algorithm && key.algorithm.length / 8 != this.KEY_LEN) {
          throw new Error("invalid key length");
        }

        if (typeof ciphertext === "string") {
          ciphertext = this.base64ToArrayBuffer(ciphertext);
        }

        return crypto.subtle.decrypt({
          name: this.SYMMETRIC_ALGORITHM,
          iv: iv
        }, key, ciphertext);
      } //Returns promise

    }, {
      key: "hash",
      value: function hash(phrase, optionalRawSalt) {
        optionalRawSalt = optionalRawSalt || null;
        var toHash = new TextEncoder().encode(phrase);

        if (optionalRawSalt) {
          var tmp = new Uint8Array(optionalRawSalt.byteLength + toHash.byteLength);
          tmp.set(new Uint8Array(optionalRawSalt));
          tmp.set(toHash, optionalRawSalt.byteLength);
          toHash = tmp;
        }

        return crypto.subtle.digest(this.HASH_ALGORITHM, toHash).then(function (hash) {
          return Promise.resolve(new Uint8Array(hash));
        });
      }
    }, {
      key: "randomIV",
      value: function randomIV() {
        return crypto.getRandomValues(new Uint8Array(this.IV_LEN));
      } //GCM MUST NOT REUSE IV WITH SAME KEY
      //Although GCM key length can be variable, 12-bit is recommended
      //NIST SP-800-38D: 8.2.1 Deterministic Construction
      //
      //startIV = random byte array of length 12
      //Fixed numerical value stays same per message
      //Incremental numerical value that changes per message (sequence number)

    }, {
      key: "deterministicIV",
      value: function deterministicIV(startIV, fixed, incremental) {
        if (startIV.byteLength != this.IV_LEN) {
          throw new Error("invalid startIV length");
        }

        var nums = [];
        startIV = new Uint8Array(startIV);

        for (var i = 0; i < startIV.byteLength; i += 4) {
          var num = 0;
          num |= startIV[i] << 0;
          num |= startIV[i + 1] << 8;
          num |= startIV[i + 2] << 16;
          num |= startIV[i + 3] << 24;
          nums.push(num);
        } //GCM recommends first byte be fixed and last two dynamic per message


        nums[0] ^= fixed;
        nums[1] ^= incremental;
        nums[2] ^= incremental;
        return new Uint8Array(new Uint32Array(nums).buffer);
      } //Hash the input and turn the first 4 bytes into a 32-bit number
      //This doesn"t need to be super unique as this value will get XOR"d with randomBytes
      //The output of this should be passed into deterministicIV "fixed" param

    }, {
      key: "deterministic32BitVal",
      value: function deterministic32BitVal(phrase) {
        return this.hash(phrase).then(function (hash) {
          var fixedVal = 0;
          fixedVal |= hash[0] << 0;
          fixedVal |= hash[1] << 8;
          fixedVal |= hash[2] << 16;
          fixedVal |= hash[3] << 24;
          return Promise.resolve(fixedVal);
        });
      } //Grabbed from: https://stackoverflow.com/a/40031979/3610169

    }, {
      key: "arrayBufferToHex",
      value: function arrayBufferToHex(arrayBuffer, delimiter) {
        delimiter = delimiter || "";
        return Array.prototype.map.call(new Uint8Array(arrayBuffer), function (x) {
          return ("00" + x.toString(16)).slice(-2);
        }).join(delimiter);
      }
    }, {
      key: "hexToArrayBuffer",
      value: function hexToArrayBuffer(hex) {
        return new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
          return parseInt(h, 16);
        })).buffer;
      } //Grabbed from: https://stackoverflow.com/a/21797381/3610169

    }, {
      key: "base64ToArrayBuffer",
      value: function base64ToArrayBuffer(base64) {
        var binary_string = atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);

        for (var i = 0; i < len; i++) {
          bytes[i] = binary_string.charCodeAt(i);
        }

        return bytes.buffer;
      }
    }, {
      key: "ArrayBufferToBase64",
      value: function ArrayBufferToBase64(arrayBuffer) {
        return btoa(new Uint8Array(arrayBuffer).reduce(function (data, _byte) {
          return data + String.fromCharCode(_byte);
        }, ""));
      }
    }]);

    return CryptoProvider;
  }();

  _exports.CryptoProvider = CryptoProvider;

  _defineProperty(CryptoProvider, "SYMMETRIC_ALGORITHM", "AES-GCM");

  _defineProperty(CryptoProvider, "IV_LEN", 12);

  _defineProperty(CryptoProvider, "KEY_LEN", 32);

  _defineProperty(CryptoProvider, "TAG_LEN", 16);

  _defineProperty(CryptoProvider, "HASH_ALGORITHM", "SHA-256");
});
