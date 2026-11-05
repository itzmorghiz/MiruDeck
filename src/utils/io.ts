/// <reference types="vite/client" />
import JSZip from "jszip";

export async function extractCodeFromMdext(fileOrBlob: Blob): Promise<string> {
	const zip = new JSZip();

	// 1. Load the zip contents
	const zipContent = await zip.loadAsync(fileOrBlob);

	// 2. Look for index.js inside the archive
	// (Handling cases where it might be at the root or inside a folder)
	let indexFile = zipContent.file("index.js");

	if (!indexFile) {
		// Search recursively just in case it's nested inside a root folder
		const allFiles = Object.keys(zipContent.files);
		const foundPath = allFiles.find((path) => path.endsWith("index.js"));
		if (foundPath) {
			indexFile = zipContent.file(foundPath);
		}
	}

	if (!indexFile) {
		throw new Error(
			"Invalid .mdext file: 'index.js' not found inside the archive.",
		);
	}

	// 3. Read the contents of index.js as text
	const codeString = await indexFile.async("text");
	return codeString;
}

export function getPublicPath(path: string): string {
	const cleanPath = path.startsWith("/") ? path.slice(1) : path;
	const base = import.meta.env.BASE_URL;

	if (base === "./") {
		return cleanPath;
	}

	if (base === "/") {
		return `/${cleanPath}`;
	}

	const normalizedBase = base.endsWith("/") ? base : `${base}/`;
	return `${normalizedBase}${cleanPath}`;
}
