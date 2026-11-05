import { joinURL, parseURL, stringifyParsedURL, stringifyQuery } from "ufo";
import type { ExtensionHelpers } from "../../src/ext/types";

export interface MangaSearchEntry {
	title: string;
	cover: string;
	url: string;
}

export default {
	async search(
		query: string,
		helpers: ExtensionHelpers,
	): Promise<MangaSearchEntry[]> {
		const url =
			joinURL(helpers.host, "/archive?") + stringifyQuery({ keyword: query });

		let page: string;
		try {
			page = await helpers.fetchPage(url);
		} catch (error) {
			throw new Error("[FETCH] " + error);
		}

		// helpers.load is Cheerio injected securely from the worker
		const $ = helpers.load(page);

		const data = $.extract({
			entries: [
				{
					selector: ".comics-grid .entry",
					value: {
						title: {
							selector: "a.manga-title",
							value: "title",
						},
						cover: {
							selector: "a.thumb img",
							value: (el: any) => {
								const src = $(el).attr("src") || "";
								const purl = parseURL(src);
								purl.search = "";

								return stringifyParsedURL(purl);
							},
						},
					},
				},
			],
		});

		return data.entries as MangaSearchEntry[];
	},
};
