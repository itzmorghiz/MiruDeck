// src/services/extension.worker.ts
import * as cheerio from "cheerio";

const worker = self as unknown as DedicatedWorkerGlobalScope;

worker.onmessage = async (event: MessageEvent) => {
	const { id, code, functionName, args, host } = event.data; // Destructure host

	try {
		const blob = new Blob([code], { type: "application/javascript" });
		const moduleUrl = URL.createObjectURL(blob);
		const extensionModule = await import(/* @vite-ignore */ moduleUrl);
		URL.revokeObjectURL(moduleUrl);

		const extension = extensionModule.default;

		const helpers = {
			load: cheerio.load,

			fetchPage: async (url: string): Promise<string> => {
				const res = await proxyToMainThread(worker, "FETCH_TEXT", { url });
				return res.text;
			},

			host, // Expose host inside helpers
		};

		if (!extension || typeof extension[functionName] !== "function") {
			throw new Error(`Function '${functionName}' not found in extension.`);
		}

		const result = await extension[functionName](...args, helpers);
		worker.postMessage({ id, success: true, result });
	} catch (err: any) {
		worker.postMessage({
			id,
			success: false,
			error: err.message || String(err),
		});
	}
};

export async function proxyToMainThread(
	worker: DedicatedWorkerGlobalScope,
	type: string,
	payload: any,
): Promise<any> {
	const channelId = Math.random().toString(36).substring(2);

	return new Promise((resolve, reject) => {
		const listener = (e: MessageEvent) => {
			if (e.data.channelId === channelId) {
				worker.removeEventListener("message", listener);
				if (e.data.error) {
					reject(new Error(e.data.error));
				} else {
					resolve(e.data); // Returns { channelId, html } directly
				}
			}
		};

		worker.addEventListener("message", listener);
		worker.postMessage({ type, channelId, ...payload });
	});
}
