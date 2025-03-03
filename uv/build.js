import { rimraf } from "rimraf";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { execSync } from "node:child_process";

// read version from package.json
const pkg = JSON.parse(await readFile("/uv/package.json"));
process.env.ULTRAVIOLET_VERSION = pkg.version;

const isDevelopment = process.argv.includes("--dev");

await rimraf("dist");
await mkdir("dist");

// don't compile these files
await copyFile("/uv/src/sw.js", "dist/sw.js");
await copyFile("/uv/src/uv.config.js", "dist/uv.config.js");

let builder = await build({
	platform: "browser",
	sourcemap: true,
	minify: !isDevelopment,
	entryPoints: {
		"uv.bundle": "/uv/src/rewrite/index.js",
		"uv.client": "/uv/src/client/index.js",
		"uv.handler": "/uv/src/uv.handler.js",
		"uv.sw": "/uv/src/uv.sw.js",
	},
	define: {
		"process.env.ULTRAVIOLET_VERSION": JSON.stringify(
			process.env.ULTRAVIOLET_VERSION
		),
		"process.env.ULTRAVIOLET_COMMIT_HASH": (() => {
			try {
				let hash = JSON.stringify(
					execSync("git rev-parse --short HEAD", {
						encoding: "utf-8",
					}).replace(/\r?\n|\r/g, "")
				);

				return hash;
			} catch (e) {
				return "unknown";
			}
		})(),
	},
	bundle: true,
	treeShaking: true,
	metafile: isDevelopment,
	logLevel: "info",
	outdir: "dist/",
});
if (isDevelopment) {
	await writeFile("metafile.json", JSON.stringify(builder.metafile));
}