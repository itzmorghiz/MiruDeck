import { parseQuery } from "ufo";
import { getActiveQuery } from "../utils/tabs";
import { MangaChapterInfo } from "../ext/types";
import Swiper from "swiper";
import { Keyboard, Zoom } from "swiper/modules";

const content = document.getElementById("reader-content")!;

const swiperElement = document.getElementById(
	"reader-swiper",
) as HTMLDivElement;

const swiperWrapper = document.getElementById(
	"reader-swiper-wrapper",
) as HTMLDivElement;

var swiper = new Swiper(swiperElement, {
	lazyPreload: true,
	modules: [Zoom, Keyboard],
	zoom: {
		maxRatio: 3,
		minRatio: 1,
		toggle: true,
	},
	keyboard: {
		enabled: true,
		onlyInViewport: true, // Recommended: only listens when Swiper is visible on screen
		pageUpDown: true, // Allows Page Up / Page Down navigation
	},
});

function resetContent() {
	swiperWrapper.innerHTML = "";
	swiper.update();
}

export async function displayChapterReader() {
	resetContent();

	const query = getActiveQuery("reader");
	if (!query) throw new Error("[DETAILS] no query string found");
	const queries = parseQuery(query);

	const ext = await ExtManager.waitForExtension(queries.source as string);

	const info = await ExtManager.runExtension<MangaChapterInfo>(
		ext.code,
		"getChapter",
		[queries],
		ext.manifest.host,
	);

	let inner = "";

	info.images.forEach((url) => {
		inner += getImageElement(url);
	});

	swiperWrapper.innerHTML = inner;

	swiper.update();
}

function getImageElement(src: string) {
	return `
        <div class="swiper-slide">
            <!-- Wrap the image in this container -->
            <div class="swiper-zoom-container">
                <img src="${src}" loading="lazy"/>
            </div>
            <div class="swiper-lazy-preloader swiper-lazy-preloader-white"></div>
        </div>
    `;
}
