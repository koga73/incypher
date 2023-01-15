# Incypher

A secure archiver intended to store crypto keys and seed phrases

## Install

You can install the npm package for command line use OR use the provided binary files

```
npm i -g incypher
```

## Build

```
npm install
npm run build
```

## Usage

Store seed phrase or keys

```
incypher store ravencoin
incypher store seed/ravencoin
```

View seed phrase or key in console

```
incypher view ravencoin
incypher view seed/ravencoin
```

Open seed phrase or key with file system default

```
incypher open ravencoin
incypher open seed/ravencoin
```

List stores

```
incypher list
```

Delete store(s)

```
incypher delete ravencoin
incypher delete seed/ravencoin
incypher delete seed
```

Import file

```
incypher import ./ravencoin.txt
incypher import ./ravencoin.txt seed/ravencoin
```

Export file

```
incypher export ravencoin
incypher export seed/ravencoin ./ravencoin.txt
```

Change password

```
incypher passwd
```

Secure erase

```
incypher erase ./ravencoin.txt
incypher nuke
```
