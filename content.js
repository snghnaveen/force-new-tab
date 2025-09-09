(() => {
    let enabled = true;
    let ignoreKeyHeld = false;

    // Cached preferences
    let whitelist = [];

    // === Storage syncing ===
    // Initial load
    chrome.storage.local.get({ enabled: true, whitelist: [] }, (res) => {
        enabled = !!res.enabled;
        whitelist = res.whitelist || [];
    });

    // Listen for changes
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local") {
            if (changes.enabled) enabled = !!changes.enabled.newValue;
            if (changes.whitelist) whitelist = changes.whitelist.newValue || [];
        }
    });

    // Messages from background.js (e.g. toolbar toggle)
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.type === "set-enabled") enabled = !!msg.enabled;
    });

    // === Key tracking (for Q override) ===
    addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "q") {
            ignoreKeyHeld = true;
        }
    });
    addEventListener("keyup", (e) => {
        if (e.key.toLowerCase() === "q") {
            ignoreKeyHeld = false;
        }
    });

    // === Helpers ===
    function findAnchorFromEvent(event) {
        // Prefer composedPath for shadow DOM
        const path = typeof event.composedPath === "function" ? event.composedPath() : [];
        for (const el of path) {
            if (el && el.tagName === "A" && el.href) return el;
        }
        // Fallback
        if (event.target && event.target.closest) {
            return event.target.closest("a[href]");
        }
        return null;
    }

    function domainFromUrl(url) {
        try {
            return new URL(url).hostname.replace(/^www\./, "");
        } catch {
            return null;
        }
    }

    function shouldIgnore(event, a) {
        if (!a) return true;

        const rawHref = a.getAttribute("href");
        if (!rawHref || rawHref.startsWith("#")) return true; // same-page anchors

        // Only intercept primary-button, unmodified clicks
        if (event.button !== 0) return true;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return true;

        const url = a.href;
        if (!url) return true;
        if (isYouTubeWithParam(url)) return true;
        if (ignoreKeyHeld) return true;

        const proto = new URL(url).protocol;
                // Skip special schemes and downloads

        if (proto === "mailto:" || proto === "tel:") return true;
        if (a.hasAttribute("download")) return true;

        // --- Whitelisted ---
        const domain = domainFromUrl(url);
        if (!domain) return true;

        if (whitelist.length > 0 && !whitelist.includes(domain)) {
            return true;
        }
        return false;
    }

    function handleClick(e) {
        if (!enabled) return;
        if (e.defaultPrevented) return;

        const a = findAnchorFromEvent(e);
        if (shouldIgnore(e, a)) return;

        const url = a.href;

        // Stop the page from handling the click
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();

        // Ask background to open a new tab
        chrome.runtime.sendMessage({ type: "open-new-tab", url });
    }

    // Capture early, not passive, so we can preventDefault
    addEventListener("click", handleClick, { capture: true, passive: false });
})();

function isYouTubeWithParam(url) {
    try {
        const parsedUrl = new URL(url);
        const isYouTube = parsedUrl.hostname === "www.youtube.com" || parsedUrl.hostname === "youtube.com";
        if (isYouTube) {
            return parsedUrl.searchParams.has("t") || parsedUrl.searchParams.has("list");
        }
        return false;
    } catch {
        return false;
    }
}
