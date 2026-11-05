import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import * as esbuild from "esbuild";
import JSZip from "jszip";

const EXTENSIONS_DIR = path.join(import.meta.dirname, "../extensions");
const OUTPUT_DIR = path.join(import.meta.dirname, "../public/extensions");

export async function buildAllExtensions() {
	const startTime = Date.now();
	console.log(`[Extensions] Starting build process...`);

	if (fs.existsSync(OUTPUT_DIR)) {
		console.log(`[Extensions] Cleaning output directory: ${OUTPUT_DIR}`);
		fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
	}
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });

	if (!fs.existsSync(EXTENSIONS_DIR)) {
		console.log(
			`[Extensions] Extensions directory not found: ${EXTENSIONS_DIR}`,
		);
		return;
	}

	const extensionFolders = fs.readdirSync(EXTENSIONS_DIR).filter((folder) => {
		const folderPath = path.join(EXTENSIONS_DIR, folder);
		return fs.statSync(folderPath).isDirectory();
	});

	console.log(
		`[Extensions] Found ${extensionFolders.length} extension folder(s) to process.`,
	);

	let successCount = 0;
	let failCount = 0;

	for (const folder of extensionFolders) {
		const folderPath = path.join(EXTENSIONS_DIR, folder);
		const buildStart = Date.now();
		console.log(`[Extensions] Building extension: "${folder}"...`);

		try {
			const result = await esbuild.build({
				entryPoints: [path.join(folderPath, "index.ts")],
				bundle: true,
				write: false,
				format: "esm",
				target: "es2022",
				external: ["cheerio"],
			});

			const compiledJs = result.outputFiles[0].text;

			const zip = new JSZip();
			zip.file("index.js", compiledJs);

			if (fs.existsSync(path.join(folderPath, "manifest.json"))) {
				zip.file(
					"manifest.json",
					fs.readFileSync(path.join(folderPath, "manifest.json")),
				);
			}
			if (fs.existsSync(path.join(folderPath, "cover.png"))) {
				zip.file(
					"cover.png",
					fs.readFileSync(path.join(folderPath, "cover.png")),
				);
			}

			const content = await zip.generateAsync({ type: "nodebuffer" });
			const outputPath = path.join(OUTPUT_DIR, `${folder}.mdext`);
			fs.writeFileSync(outputPath, content);

			const duration = Date.now() - buildStart;
			console.log(
				`[Extensions] ✓ Successfully built "${folder}" -> public/extensions/${folder}.mdext (${duration}ms)`,
			);
			successCount++;
		} catch (err) {
			console.error(
				`[Extensions] ✗ Failed to build extension "${folder}":`,
				err,
			);
			failCount++;
		}
	}

	const totalDuration = Date.now() - startTime;
	console.log(
		`[Extensions] Build finished in ${totalDuration}ms. Success: ${successCount}, Failed: ${failCount}`,
	);
}

export function watchExtensions() {
	if (!fs.existsSync(EXTENSIONS_DIR)) {
		console.log(
			`[Extensions] Cannot watch. Extensions directory not found: ${EXTENSIONS_DIR}`,
		);
		return;
	}

	let timeout: NodeJS.Timeout | null = null;

	console.log(`[Extensions] Initializing file watcher on ${EXTENSIONS_DIR}...`);

	fs.watch(EXTENSIONS_DIR, { recursive: true }, (eventType, filename) => {
		if (filename) {
			console.log(
				`[Extensions] File change detected: ${filename} (${eventType}). Debouncing for 2s...`,
			);
		} else {
			console.log(
				`[Extensions] Change detected in extensions directory. Debouncing for 2s...`,
			);
		}

		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(async () => {
			console.log(
				`[Extensions] 2-second debounce threshold reached. Triggering rebuild...`,
			);
			try {
				await buildAllExtensions();
			} catch (err) {
				console.error(
					`[Extensions] Rebuild process encountered an error:`,
					err,
				);
			}
		}, 2000);
	});
}

// Automatically execute when run directly from the CLI
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const isWatch =
		process.argv.includes("--watch") || process.argv.includes("-w");
	if (isWatch) {
		watchExtensions();
	} else {
		buildAllExtensions();
	}
}
