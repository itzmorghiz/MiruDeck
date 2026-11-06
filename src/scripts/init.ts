import { NavigationBar, TextField } from "mdui";
import { search } from "./search";
import { ExtensionManager } from "../ext/manager";
import { initTabFromURL, setActiveTab } from "../utils/tabs";
import { isTauri } from "@tauri-apps/api/core";
import { setupDeepLinking } from "../utils/deepLink";
import { getPublicPath } from "../utils/io";
import { displayDetails } from "./details";
import { ExtensionPackage } from "../ext/types";
import { listenForCollapse } from "../utils/elements";
import { displayChapterReader } from "./reader";

declare global {
	let ExtManager: ExtensionManager;
	let Extensions: Record<string, ExtensionPackage>;
	let ActiveTab: Record<string, HTMLElement>;
}

(globalThis as any).ActiveTab = {};
(globalThis as any).ExtManager = new ExtensionManager();
(globalThis as any).Extensions = {};

const exts: string[] = [getPublicPath("extensions/mangaworld.mdext")];

exts.forEach(async (path) => {
	const res = await fetch(path);
	const archiveBuffer = await res.arrayBuffer();
	const ext = await ExtManager.loadExtensionArchive(archiveBuffer);
	Extensions[ext.manifest.id] = ext;
});

const searchForm = document.getElementById("search-form") as HTMLFormElement;
const searchBar = document.getElementById("search-bar") as any as TextField;

export const resultsDiv = document.getElementById(
	"search-results",
) as HTMLDivElement;

searchForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	searchBar.blur();

	resultsDiv.innerHTML = "";

	const query = searchBar.value.trim();

	search(query);
});

document.addEventListener("DOMContentLoaded", () => {
	listenForCollapse(document);
});

const backBtns = [...document.getElementsByClassName("back-button")];
backBtns.forEach((btn) => {
	btn.addEventListener("click", () => {
		history.back();
	});
});

const navBar = document.getElementById("main-navbar") as NavigationBar;
navBar.addEventListener("change", () => {
	setActiveTab(navBar.value || "");
});

const detailsPage = document.getElementById("details")!;
detailsPage.addEventListener("tabactivate", () => {
	displayDetails();
});

const readerPage = document.getElementById("reader")!;
readerPage.addEventListener("tabactivate", () => {
	displayChapterReader();
});

initTabFromURL();

if (isTauri()) {
	setupDeepLinking();
}
