const exe = require("@angablue/exe");
const {bin: packageBin, name: packageName, version: packageVersion, description: packageDescription, author: packageAuthor} = require("./package.json");

const year = new Date().getFullYear();
const build = exe({
	entry: packageBin[packageName],
	out: `build/${packageName}-win.exe`,
	pkg: [],
	version: `${packageVersion}.0`,
	//icon: "./assets/icon.ico",
	properties: {
		FileDescription: packageDescription,
		ProductName: packageName.substring(0, 1).toUpperCase() + packageName.substring(1, packageName.length),
		LegalCopyright: `${packageAuthor} | ${year}`,
		OriginalFilename: `${packageName}.exe`
	}
});
build.then(() => console.log("Build completed!"));
