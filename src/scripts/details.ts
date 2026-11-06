import { parseQuery, stringifyQuery } from "ufo";
import {
	MangaChapterEntry,
	MangaDetails,
	MangaGenre,
	MangaVolumeEntry,
	MediaStatus,
} from "../ext/types";
import { getActiveQuery, setActiveTab } from "../utils/tabs";
import { getMDUIIcon, getMDUISlot, listenForCollapse } from "../utils/elements";
import placeholderCover from "../assets/placeholder_cover.jpg?inline";
import { Button, Collapse, List, ListItem } from "mdui";
import dayjs from "dayjs";

const content = document.getElementById("details-content")!;
const initContent = content.innerHTML;

function resetContent() {
	content.innerHTML = initContent;
}

const statusText: Record<MediaStatus, string> = {
	[MediaStatus.COMPLETED]: "Completed",
	[MediaStatus.ONGOING]: "Ongoing",
	[MediaStatus.PLANNED]: "Planned",
	[MediaStatus.HOLD]: "On hold",
	[MediaStatus.DROPPED]: "Dropped",
	[MediaStatus.UNKNOWN]: "Unknown status",
};

export async function displayDetails() {
	resetContent();

	const startBtn = document.getElementById("start-continue-button") as Button;
	const titleEl = document.getElementById("meta-title")!;
	const titleBarEl = document.getElementById("meta-bar-title")!;
	const authorsEl = document.getElementById("meta-authors")!;
	const statusEl = document.getElementById("meta-status")!;
	const sourceEl = document.getElementById("meta-source")!;
	const descEl = document.getElementById("meta-description")!;
	const imageEl = document.getElementById("media-cover") as HTMLImageElement;

	const query = getActiveQuery("details");
	if (!query) throw new Error("[DETAILS] no query string found");
	const queries = parseQuery(query);

	const ext = await ExtManager.waitForExtension(queries.source as string);

	const details = await ExtManager.runExtension<MangaDetails>(
		ext.code,
		"details",
		[queries],
		ext.manifest.host,
	);

	imageEl.src = details.cover || placeholderCover;

	if (imageEl.complete) {
		if (imageEl.naturalWidth > 0) {
			onImageLoaded(imageEl);
		} else {
			console.error("Image failed to load (broken link).");
		}
	} else {
		imageEl.addEventListener("load", () => {
			onImageLoaded(imageEl);
		});
	}

	startBtn.innerHTML = getMDUIIcon("book_ribbon", "", "end") + "READ";

	titleEl.innerText = details.title;
	titleBarEl.innerHTML = details.title + `<span slot="label-large"></span>`;

	authorsEl.innerHTML =
		getMDUIIcon("person", "meta-icon") +
		(details.authors ? details.authors.join(", ") : "Unknown author");
	statusEl.innerHTML =
		getMDUIIcon("schedule", "meta-icon") + statusText[details.status];
	sourceEl.innerHTML = getMDUIIcon("code", "meta-icon") + ext.manifest.name;

	if (details.description) {
		descEl.innerText = details.description;
	} else {
		descEl.parentElement?.remove();
	}

	const volumeList = document.getElementById("volumes-list") as Collapse;
	const chapterList = document.getElementById("chapters-list") as List;

	if (details.genre == MangaGenre.VOLUMES) {
		const volumes = details.content as MangaVolumeEntry[];

		volumes.forEach((vol) => {
			volumeList.insertAdjacentHTML("beforeend", getVolumeElement(vol));

			const volumeChapterList = volumeList.lastElementChild!.querySelector(
				"mdui-list",
			) as List;

			volumeChapterList.insertAdjacentHTML(
				"beforeend",
				vol.chapters.map((chap) => getChapterElement(chap)).join(""),
			);
		});

		listenForCollapse(volumeList);
		chapterList.remove();
	} else {
		const chapters = details.content as MangaChapterEntry[];

		chapters.forEach((chap) => {
			volumeList.insertAdjacentHTML("beforeend", getChapterElement(chap));
		});

		volumeList.remove();
	}

	const chapters = [
		...content.querySelectorAll(".chapter-entry"),
	] as ListItem[];
	chapters.forEach((chap) => {
		chap.addEventListener("click", () => {
			readChapter(
				ext.manifest.id,
				chap.getAttribute("data-id")!,
				queries["id"] as string | undefined,
				queries["slur"] as string | undefined,
			);
		});
	});

	const loading = [
		...content.querySelectorAll(":not(#media-cover-wrapper).loading"),
	];
	loading.forEach((el) => {
		el.classList.remove("loading");
	});
}

function getVolumeElement(vol: MangaVolumeEntry) {
	return `
		<mdui-collapse-item value="volume-${vol.index}">
			<mdui-list-item slot="header">
				<span class="volume-name">${vol.name || "Volume " + vol.index.toString()}</span>
				<mdui-icon name="arrow_right" slot="end-icon" class="collapse-arrow"></mdui-icon>
			</mdui-list-item>
			<mdui-list class="volume-chapters"></mdui-list>
		</mdui-collapse-item>
		`;
}

function getChapterElement(chap: MangaChapterEntry) {
	return `
			<mdui-list-item class="chapter-entry"${chap.id ? ' data-id="' + chap.id + '"' : ""}>
				<span class="chapter-name">${chap.name || "Chapter " + chap.index.toString()}</span>
				${chap.date ? getMDUISlot("i", "description", dayjs(chap.date, "YYYY-MM-DD").format("MMMM DD YYYY")) : ""}
			</mdui-list-item>
		`;
}

function onImageLoaded(image: HTMLImageElement) {
	image.parentElement!.classList.remove("loading");
}

function readChapter(
	source: string,
	chap_id: string,
	manga_id: string | undefined,
	manga_slur: string | undefined,
) {
	setActiveTab(
		"reader",
		true,
		stringifyQuery({ source, chap_id, manga_id, manga_slur }),
	);
}
