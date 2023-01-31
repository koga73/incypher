
# Incypher

A secure archiver intended to store crypto keys and seed phrases

![Incypher Logo](_artifacts/icon-logo.png)

## Install with NodeJS

If you use NodeJS you can install the npm package for command line use:

```
npm install incypher --global
```

---

## Install pre-built binaries

Don't know what NodeJS is? You can use the pre-built binaries instead!
<br/>
Download the executables from the [latest release](https://github.com/koga73/incypher/releases)

---

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

##### Edit config

```
incypher config
```

---

## Cloud sync

Incypher supports syncing your encrypted keystore to the cloud making it easy to use across multiple platforms!
<br/>
<br/>
The config contains commands to ```init```, ```upload``` and ```download``` using *rclone* by default. We recommend using *rclone* as it can connect to many different cloud providers as well as virtual backends that can add additional encryption, chunking and compression.

### Enabling cloud sync

Follow the steps below to enable cloud sync:

1. Install and configure [rclone](https://rclone.org)
1. Add ```rclone``` to your ```PATH```
1. Run ```incypher config``` to edit the config file
1. Update ```sync```.```enabled```: to ```true```

Optionally you can customize the ```init```, ```upload``` and ```download``` commands in the config file to suit your needs.

---

## Build

If you prefer you can build the binaries yourself:

1. Install [NodeJS](https://nodejs.org/en/)
1. ```cd``` to the code directory
1. ```npm install```
1. ```npm run build```

Binaries will be output to the ```build``` directory

---

## Encryption Details

Incypher creates an archive then encrypts the data using [AES-256](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)-[GCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode) as follows

1. A 12-byte initial IV (Initialization Vector) is generated via a cryptographically secure random bytes generator and is written to the file header
1. A 32-bit currentIncrement value starts at random (0-65535) and increments once each time we encrypt and is written to the file header
1. A deterministic IV is constructed via the starting IV, a fixed value and the currentIncrement value
1. The deterministic IV function follows NIST SP-800-38D: 8.2.1 Deterministic Construction
1. This ensures that we do not reuse the same IV and it cannot be predicted per AES-GCM specifications
1. A 16-byte random salt is generated via a cryptographically secure random bytes generator and is written to the file header
1. The random salt is then combined with the user passphrase and hashed via scrypt to generate the 256-bit encryption key
1. Encryption takes place using AES-256-GCM and the resulting GCM integrity tag is appended to the end of the ciphertext

---

## Notes
- You can override the default config directory location by creating an environment variable called ```INCYPHER_HOME```
- You can optionally drag-and-drop file(s) on the executable to import them directly
- You can disable encryption by passing an empty passphrase (not recommended). With encryption disabled you can open the store.incypher file with your favorite zip archiver