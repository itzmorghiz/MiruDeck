import type { CheerioAPI } from "cheerio";

export enum MediaStatus {
	COMPLETED,
	ONGOING,
	PLANNED,
	HOLD,
	DROPPED,
	UNKNOWN,
}

export enum MangaGenre {
	VOLUMES,
	CHAPTERS,
}

export enum MangaReadingMode {
	PAGED,
	STRIP,
	UNKNOWN,
}

export type MangaChapterEntry = {
	name?: string;
	index: number;
	id?: string;
	date?: string;
};

export type MangaChapterInfo = {
	readingMode: MangaReadingMode;
	index: number;
	images: string[];
	pageCount: number;
	chapterCount?: number;
	volumeIndex?: number;
	volumeCount?: number;
	nextChapter?: string;
	prevChapter?: string;
	nextVolume?: string;
	prevVolume?: string;
};

export type MangaVolumeEntry = {
	name?: string;
	index: number;
	chapters: MangaChapterEntry[];
};

export type MangaSearchEntry = {
	title: string;
	slur?: string;
	id?: string;
	cover?: string;
};

export type MangaDetails = {
	title: string;
	url: string;
	cover?: string;
	description?: string;
	status: MediaStatus;
	genre: MangaGenre;
	authors?: string[];
	content?: MangaChapterEntry[] | MangaVolumeEntry[];
};

export interface ExtensionHelpers {
	load: (html: string) => CheerioAPI;
	fetchPage: (url: string) => Promise<string>;
	host: string;
}

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
