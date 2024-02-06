//Node imports
import {promises as fs} from "fs";
import path from "path";

class _class {
	static async fsExists(filePath) {
		return await fs
			.stat(filePath)
			.then(() => true)
			.catch(() => false);
	}

	//Ensure our fileName has a file extension
	static ensureExtension(fileName) {
		const extension = path.extname(fileName);
		if (extension == "") {
			return `${fileName}.txt`;
		}
		return fileName;
	}

	//Convert 1.2.3 to hex 010203
	static getFixedVersion(version) {
		return [...version.matchAll(/\d+/g)]
			.map((val) => {
				const buff = Buffer.alloc(1);
				buff.writeUint8(val[0]);
				return buff;
			})
			.reduce((buff, val) => Buffer.concat([buff, val]), Buffer.alloc(0))
			.toString("hex");
	}
}
export default _class;
