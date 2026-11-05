import { NavigationBar } from "mdui";

const PAGE_TREE = {
	main: {
		navbar: true,
		home: {},
		search: {},
		settings: {},
	},
	"reader-page": {
		navbar: false,
	},
};

let globalFallbackTabId: string | null = "search";

export function setGlobalFallbackTab(id: string) {
	if (!PAGE_REGISTRY[id]) {
		throw new Error(
			`[TAB] Page configuration not found for fallback id '${id}'.`,
		);
	}
	globalFallbackTabId = id;
}

interface PageEntry {
	parent: string;
	navbar: boolean;
	path: string[];
}

const PAGE_REGISTRY: Record<string, PageEntry> = {};

function traverseTree(
	node: Record<string, any>,
	parent: string = "body",
	path: string[] = ["body"],
) {
	for (const [key, value] of Object.entries(node)) {
		if (key === "navbar") continue;

		const config = value || {};
		const navbar = !!config.navbar;
		const currentPath = [...path, key];

		PAGE_REGISTRY[key] = {
			parent,
			navbar,
			path: currentPath,
		};

		const children = Object.fromEntries(
			Object.entries(config).filter(([k]) => k !== "navbar"),
		);

		if (Object.keys(children).length > 0) {
			traverseTree(children, key, currentPath);
		}
	}
}

traverseTree(PAGE_TREE);

const ActiveTab: Record<string, HTMLElement | null> = {};

function getURLHash(id: string): string {
	return `#${id}`;
}

export function setActiveTab(id: string, pushHistory?: boolean) {
	console.log("[CHANGE] activating tab id '" + id + "'.");

	const entry = PAGE_REGISTRY[id];
	if (!entry) {
		throw new Error(`[TAB] Page configuration not found for id '${id}'.`);
	}

	const { parent } = entry;
	const parentConfig = PAGE_REGISTRY[parent];

	const isNavbarTab = parentConfig && parentConfig.navbar;
	const isAlreadyInNavbar = isNavbarTab && ActiveTab["body"]?.id === parent;

	let shouldPush = pushHistory;
	if (shouldPush === undefined) {
		if (!isAlreadyInNavbar) {
			// Coming from a full page into the navbar (or vice versa)
			shouldPush = true;
		} else {
			// Already inside the navbar.
			// Push history ONLY when leaving the fallback navbar tab for another tab,
			// so the fallback tab remains in history to return to before closing.
			// Subsequent switches between other tabs use replaceState.
			const currentActiveTabId = ActiveTab[parent]?.id;
			const isLeavingFallback =
				currentActiveTabId === globalFallbackTabId &&
				id !== globalFallbackTabId;

			shouldPush = isLeavingFallback;
		}
	}

	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`[TAB] Unable to find DOM element with id '${id}'.`);
	}

	if (parent !== "body" && ActiveTab["body"]?.id !== parent) {
		setActiveTab(parent, false);
	}

	const parentNode = document.getElementById(parent);
	if (!parentNode) {
		throw new Error(
			`[TAB] Unable to find parent container with id '${parent}'.`,
		);
	}

	const old = ActiveTab[parent];
	ActiveTab[parent] = element;

	element.setAttribute("active", "true");

	if (old && old !== element) {
		old.removeAttribute("active");
	}

	if (isNavbarTab) {
		const navBar = parentNode.querySelector(
			"mdui-navigation-bar",
		) as NavigationBar | null;

		if (navBar) {
			navBar.value = id;
		}
	}

	if (typeof window !== "undefined") {
		const currentState = history.state;
		const targetState = { tabId: id };

		if (shouldPush) {
			if (!currentState || currentState.tabId !== id) {
				history.pushState(targetState, "", getURLHash(id));
			}
		} else {
			history.replaceState(targetState, "", getURLHash(id));
		}
	}
}

export function initTabFromURL(defaultTabId?: string) {
	if (typeof window === "undefined") return;

	const hashContent = window.location.hash ? window.location.hash.slice(1) : "";
	let targetId = hashContent ? hashContent.split("/").pop() || "" : "";

	if (
		!targetId ||
		!PAGE_REGISTRY[targetId] ||
		!document.getElementById(targetId)
	) {
		if (
			defaultTabId &&
			PAGE_REGISTRY[defaultTabId] &&
			document.getElementById(defaultTabId)
		) {
			targetId = defaultTabId;
		} else if (
			globalFallbackTabId &&
			PAGE_REGISTRY[globalFallbackTabId] &&
			document.getElementById(globalFallbackTabId)
		) {
			targetId = globalFallbackTabId;
		}
	}

	if (
		targetId &&
		PAGE_REGISTRY[targetId] &&
		document.getElementById(targetId)
	) {
		const entry = PAGE_REGISTRY[targetId];
		const chain = entry.path.slice(1);

		for (let i = 0; i < chain.length - 1; i++) {
			setActiveTab(chain[i], false);
		}

		setActiveTab(targetId, false);
	}
}

if (typeof window !== "undefined") {
	window.addEventListener("popstate", (event) => {
		const state = event.state;
		let targetId = "";

		if (state && state.tabId && PAGE_REGISTRY[state.tabId]) {
			targetId = state.tabId;
		} else {
			const hashContent = window.location.hash
				? window.location.hash.slice(1)
				: "";
			targetId = hashContent ? hashContent.split("/").pop() || "" : "";
		}

		if (
			targetId &&
			PAGE_REGISTRY[targetId] &&
			document.getElementById(targetId)
		) {
			const entry = PAGE_REGISTRY[targetId];
			const chain = entry.path.slice(1);
			for (let i = 0; i < chain.length - 1; i++) {
				setActiveTab(chain[i], false);
			}
			setActiveTab(targetId, false);
		} else if (
			globalFallbackTabId &&
			PAGE_REGISTRY[globalFallbackTabId] &&
			document.getElementById(globalFallbackTabId)
		) {
			const entry = PAGE_REGISTRY[globalFallbackTabId];
			const chain = entry.path.slice(1);
			for (let i = 0; i < chain.length - 1; i++) {
				setActiveTab(chain[i], false);
			}
			setActiveTab(globalFallbackTabId, false);
		}
	});
}
