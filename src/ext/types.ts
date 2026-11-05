import type { CheerioAPI } from "cheerio";

export type MangaSearchEntry = {
	title: string;
	cover?: string;
};

export interface ExtensionHelpers {
	load: (html: string) => CheerioAPI;
	fetchPage: (url: string) => Promise<string>;
	host: string;
}

export interface MangaItem {
	title: string;
	url: string;
	cover: string;
}

export interface ExtensionManifest {
	id: string;
	name: string;
	version: string;
	host: string;
	icon?: string;
}

export interface ScraperExtension {
	manifest: ExtensionManifest;
	search: (query: string, helpers: ExtensionHelpers) => Promise<MangaItem[]>;
	getChapters?: (mangaUrl: string, helpers: ExtensionHelpers) => Promise<any[]>;
	getPageImages?: (
		chapterUrl: string,
		helpers: ExtensionHelpers,
	) => Promise<string[]>;
}
