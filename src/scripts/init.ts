import { NavigationBar, TextField } from "mdui";
import { search } from "./search";
import { ExtensionManager, ExtensionPackage } from "../ext/manager";
import { initTabFromURL, setActiveTab } from "../utils/tabs";
import { isTauri } from "@tauri-apps/api/core";
import { setupDeepLinking } from "../utils/deepLink";
import { getPublicPath } from "../utils/io";

declare global {
	let ExtManager: ExtensionManager;
	let Extensions: Record<string, ExtensionPackage>;
	let ActiveTab: Record<string, HTMLElement>;
}

(globalThis as any).ActiveTab = {};
(globalThis as any).ExtManager = new ExtensionManager();
(globalThis as any).Extensions = {};

//setActiveTab("search", false);

initTabFromURL();

if (isTauri()) {
	setupDeepLinking();
}

//setActiveTab("reader");

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

const navBar = document.getElementById("main-navbar") as NavigationBar;
navBar.addEventListener("change", () => {
	console.log("[NAVBAR] " + navBar.value);
	setActiveTab(navBar.value || "");
});
