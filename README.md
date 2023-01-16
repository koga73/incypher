
# Incypher

A secure archiver intended to store crypto keys and seed phrases

![Incypher Logo](_artifacts/icon-logo.png)

## Install with NodeJS

If you use NodeJS you can install the npm package for command line use

```
npm install incypher --global
```

## Pre-built Binaries

Don't know what NodeJS is? You can use the pre-built binaries instead!
<br/>
Download the executables from the ```build``` directory and use them from the command line

## Build

If you prefer you can build the binaries yourself

- Install [NodeJS](https://nodejs.org/en/)

Then ```cd``` to this directory and run the following commands

```
npm install
npm run build
```

Binaries will be output to the ```build``` directory

## Usage

##### Store seed phrase or keys

```
incypher store ravencoin
incypher store seed/ravencoin
```

##### View seed phrase or key in console

```
incypher view ravencoin
incypher view seed/ravencoin
```

##### Open seed phrase or key with file system default

```
incypher open ravencoin
incypher open seed/ravencoin
```

##### List stores

```
incypher list
```

##### Delete store(s)

```
incypher delete ravencoin
incypher delete seed/ravencoin
incypher delete seed
```

##### Import file

```
incypher import ./ravencoin.txt
incypher import ./ravencoin.txt seed/ravencoin
```

##### Export file

```
incypher export ravencoin
incypher export seed/ravencoin ./ravencoin.txt
```

##### Change password

```
incypher passwd
```

##### Secure erase

```
incypher erase ./ravencoin.txt
incypher nuke
```

### Notes
- You can optionally you can drag-and-drop file(s) on the executable to import them directly

## Encryption Details

Incypher creates an archive and encrypts the data using [AES-256](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)-[GCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode) as follows

1. A 12-byte initial IV (Initialization Vector) is generated via a cryptographically secure random bytes generator and is written to the file header
2. A 32-bit currentIncrement value starts at random (0-65535) and increments once each time we encrypt and is written to the file header
3. A deterministic IV is constructed via the starting IV, a fixed value and the currentIncrement value
4. The deterministic IV function follows NIST SP-800-38D: 8.2.1 Deterministic Construction
5. This ensures that we do not reuse the same IV and it cannot be predicted per AES-GCM specifications
6. A 16-byte random salt is generated via a cryptographically secure random bytes generator and is written to the file header
7. The random salt is then combined with the user passphrase and hashed via scrypt to generate the 256-bit encryption key
8. Encryption takes place using AES-256-GCM and the resulting GCM integrity tag is appended to the end of the ciphertext
