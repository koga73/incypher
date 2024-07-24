const path = require("path");

const packageJson = require("./package.json");
const {name: packageName, version: packageVersion, author: packageAuthor} = packageJson;

module.exports = {
	mode: "production",
	entry: "./bin/cli.js",
	target: "node",
	output: {
		path: path.join(__dirname, "build"),
		filename: `${packageName}.js`,
		chunkFormat: "commonjs"
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
