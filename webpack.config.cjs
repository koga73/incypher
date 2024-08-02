const path = require("path");

const nodeExternals = require("webpack-node-externals");

const packageJson = require("./package.json");
const {name: packageName, version: packageVersion, author: packageAuthor} = packageJson;

module.exports = {
	mode: "production",
	entry: "./bin/cli.js",
	target: "node",
	externals: [
		nodeExternals({
			modulesFromFile: {
				fileName: "package.json",
				includeInBundle: ["dependencies"],
				excludeInBundle: ["devDependencies", "peerDependencies"]
			}
		})
	],
	output: {
		path: path.join(__dirname, "build"),
		filename: `${packageName}.cjs`,
		chunkFormat: "commonjs",
		clean: true
	},
	module: {
		rules: [
			{
				test: /\.m?js$/,
				use: {
					loader: "babel-loader",
					options: {
						presets: ["@babel/preset-env"],
						plugins: ["@babel/plugin-syntax-import-assertions"]
					}
				}
			}
		]
	}
};
