// @ts-ignore
import JSZip from "jszip";
import Worker from "./ext.worker?worker";
import { browserFetch } from "../utils/fetch";

export interface ExtensionPackage {
	manifest: {
		id: string;
		name: string;
		version: string;
		host: string;
		author?: string;
	};
	code: string;
	iconUrl?: string;
}

export class ExtensionManager {
	private worker: Worker;
	private pendingRequests = new Map<
		string,
		{ resolve: (val: any) => void; reject: (err: any) => void }
	>();

	constructor() {
		this.worker = new Worker();

		this.worker.onmessage = async (e: MessageEvent) => {
			const { type, channelId, url, id, success, result, error } = e.data;

			// Handle network requests proxied from inside the worker sandbox
			if (type === "FETCH_TEXT") {
				try {
					const response = await browserFetch(url);
					const text = await response.text();
					this.worker.postMessage({ channelId, text });
				} catch (err: any) {
					this.worker.postMessage({ channelId, error: err.toString() });
				}
				return;
			}

			// Handle function return values from runExtension calls
			if (id && this.pendingRequests.has(id)) {
				const { resolve, reject } = this.pendingRequests.get(id)!;
				this.pendingRequests.delete(id);

				if (success) resolve(result);
				else reject(new Error(error));
			}
		};
	}

	/**
	 * Unpacks a .mdext (ZIP) ArrayBuffer into an ExtensionPackage
	 */
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

		return { manifest, code, iconUrl };
	}

	/**
	 * Executes a function on an extension's raw code string inside the worker sandbox
	 */
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
