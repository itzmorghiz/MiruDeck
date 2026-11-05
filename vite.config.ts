import { defineConfig } from "vite";
import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import RemoteAssets from "vite-plugin-remote-assets";
import { buildAllExtensions } from "./scripts/build-extensions.ts";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(() => ({
	plugins: [
		RemoteAssets(),
		{
			name: "vite-plugin-mdext-watcher",
			async configureServer(server) {
				// 1. Build extensions automatically when dev server starts
				await buildAllExtensions();

				// 2. Watch your extensions directory with a 2-second debounce during dev preview
				const extDir = path.resolve(import.meta.dirname, "extensions");
				if (fs.existsSync(extDir)) {
					let timeout: NodeJS.Timeout | null = null;

					console.log(
						`[Extensions] Initializing Vite file watcher on ${extDir}...`,
					);

					fs.watch(extDir, { recursive: true }, (_eventType, filename) => {
						if (filename) {
							console.log(
								`[Extensions] File change detected: ${filename}. Debouncing for 2s...`,
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
								console.log(
									`[Extensions] Rebuild complete. Triggering browser full-reload...`,
								);
								// Trigger a full browser reload to pick up the newly generated .mdext files
								server.ws.send({ type: "full-reload" });
							} catch (err) {
								console.error(
									`[Extensions] Rebuild process encountered an error:`,
									err,
								);
							}
						}, 2000);
					});
				}
			},
		},
	],
	clearScreen: false,
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: "ws",
					host,
					port: 1421,
				}
			: undefined,
		watch: {
			ignored: ["**/src-tauri/**"],
		},
	},
	build: {
		chunkSizeWarningLimit: 2000,
		emptyOutDir: true,
	},
}));
