import { CircularProgress } from "mdui";
import { MangaSearchEntry } from "../ext/types";
import { resultsDiv } from "./init";

export function search(query: string) {
	console.log("[SEARCH] " + query);

	let sepNeed = false;

	Object.keys(Extensions).forEach((id) => {
		const ext = Extensions[id];

		if (sepNeed) {
			resultsDiv.innerHTML += `
					<mdui-divider></mdui-divider>
					`;
		}
		sepNeed = true;
		resultsDiv.innerHTML += `
					<div class="source-container" data-source="${ext.manifest.id}">
						<div class="source-result-top">
							<h4 class="source-result-name">${ext.manifest.name}</h4>
							<mdui-circular-progress class="source-loader"></mdui-circular-progress>
						</div>

						<div class="search-results"></div>
					</div>
				`;
	});

	Object.keys(Extensions).forEach(async (id) => {
		const ext = Extensions[id];

		const host = ext.manifest.host;

		const entries = await ExtManager.runExtension<MangaSearchEntry[]>(
			ext.code,
			"search",
			[query],
			host,
		);

		console.log(entries);

		const sourceTopDiv = resultsDiv.querySelector(
			`.source-container[data-source="${ext.manifest.id}"]`,
		) as HTMLDivElement;
		const sourceDiv = sourceTopDiv.querySelector(
			`.search-results`,
		) as HTMLDivElement;

		entries.forEach((entry) => {
			sourceDiv.innerHTML += /*html*/ `
						<mdui-card clickable class="result-entry">
							<img class="cover" src="${entry.cover}" />
							<div class="info">
								<h5 class="title">${entry.title}</h5>
							</div>
						</mdui-card>
				`;

			const loader = sourceTopDiv.querySelector(
				".source-loader",
			) as CircularProgress;
			loader.setAttribute("hidden", "true");
		});
	});
}
