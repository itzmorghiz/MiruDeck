import JSZip from "jszip";
import Worker from "./ext.worker?worker";
import { browserFetch } from "../utils/fetch";
import { ExtensionPackage } from "./types";

export interface ExtensionManagerOptions {
	maxRetries?: number;
	retryDelay?: number; // in milliseconds
}

export class ExtensionManager {
	private worker: Worker;
	private pendingRequests = new Map<
		string,
		{ resolve: (val: any) => void; reject: (err: any) => void }
	>();
	private loadedExtensions = new Map<string, ExtensionPackage>();
	private waitResolvers = new Map<
		string,
		{ resolve: (pkg: ExtensionPackage) => void; reject: (err: any) => void }[]
	>();
	private maxRetries: number;
	private retryDelay: number;

	constructor(options: ExtensionManagerOptions = {}) {
		this.maxRetries = options.maxRetries ?? 3;
		this.retryDelay = options.retryDelay ?? 1000;

		this.worker = new Worker();

		this.worker.onmessage = async (e: MessageEvent) => {
			const { type, channelId, url, id, success, result, error } = e.data;

			switch (type) {
				case "FETCH_TEXT":
					let attempts = 0;
					let lastError: any = null;

					while (attempts <= this.maxRetries) {
						try {
							const response = await browserFetch(url);
							if (!response.ok) {
								throw new Error(`HTTP error! status: ${response.status}`);
							}
							const text = await response.text();
							this.worker.postMessage({ channelId, text, success: true });
							return;
						} catch (err: any) {
							lastError = err;
							attempts++;
							if (attempts <= this.maxRetries) {
								await new Promise((res) => setTimeout(res, this.retryDelay));
							}
						}
					}

					// If all retries fail
					this.worker.postMessage({
						channelId,
						error: lastError
							? lastError.toString()
							: "Fetch failed after max retries",
					});
					break;

				default:
					if (id && this.pendingRequests.has(id)) {
						const { resolve, reject } = this.pendingRequests.get(id)!;
						this.pendingRequests.delete(id);

						if (success) resolve(result);
						else reject(new Error(error));
					}
			}
		};
	}

	public async loadExtensionArchive(
		buffer: ArrayBuffer,
	): Promise<ExtensionPackage> {
		const zip = await JSZip.loadAsync(buffer);

		const manifestFile = zip.file("manifest.json");
		const codeFile = zip.file("index.js");

		if (!manifestFile || !codeFile) {
			throw new Error(
				"Invalid .mdext archive: missing manifest.json or index.js",
			);
		}

		const manifestText = await manifestFile.async("string");
		const manifest = JSON.parse(manifestText);
		const code = await codeFile.async("string");

		let iconUrl: string | undefined;
		const iconFile = zip.file("cover.png");
		if (iconFile) {
			const blob = await iconFile.async("blob");
			iconUrl = URL.createObjectURL(blob);
		}

		const pkg: ExtensionPackage = { manifest, code, iconUrl };

		if (manifest && manifest.id) {
			this.setExtensionLoaded(manifest.id, pkg);
		}

		return pkg;
	}

	public setExtensionLoaded(id: string, pkg: ExtensionPackage): void {
		this.loadedExtensions.set(id, pkg);
		if (this.waitResolvers.has(id)) {
			for (const waiter of this.waitResolvers.get(id)!) {
				waiter.resolve(pkg);
			}
			this.waitResolvers.delete(id);
		}
	}

	public async waitForExtension(
		id: string,
		timeout: number = 2000,
	): Promise<ExtensionPackage> {
		if (this.loadedExtensions.has(id)) {
			return this.loadedExtensions.get(id)!;
		}

		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				if (this.waitResolvers.has(id)) {
					const resolvers = this.waitResolvers.get(id)!;
					const index = resolvers.findIndex((r) => r.resolve === resolve);
					if (index !== -1) {
						resolvers.splice(index, 1);
					}
					if (resolvers.length === 0) {
						this.waitResolvers.delete(id);
					}
				}
				reject(
					new Error(
						`Timeout: Extension with id "${id}" failed to load within ${timeout}ms.`,
					),
				);
			}, timeout);

			if (!this.waitResolvers.has(id)) {
				this.waitResolvers.set(id, []);
			}
			this.waitResolvers.get(id)!.push({
				resolve: (pkg) => {
					clearTimeout(timer);
					resolve(pkg);
				},
				reject: (err) => {
					clearTimeout(timer);
					reject(err);
				},
			});
		});
	}

	public runExtension<T = any>(
		code: string,
		functionName: string,
		args: any[] = [],
		host: string,
	): Promise<T> {
		return new Promise((resolve, reject) => {
			const id = Math.random().toString(36).substring(2);
			this.pendingRequests.set(id, { resolve, reject });

			this.worker.postMessage({
				id,
				code,
				functionName,
				args,
				host,
			});
		});
	}

	public terminate() {
		this.worker.terminate();
	}
}
