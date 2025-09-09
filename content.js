(() => {
    let enabled = true;
    let ignoreKeyHeld = false;

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


    // Get initial state
    chrome.storage.local.get({ enabled: true }, (res) => (enabled = !!res.enabled));

    // Update when background toggles
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.enabled) enabled = !!changes.enabled.newValue;
    });
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.type === "set-enabled") enabled = !!msg.enabled;
    });

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

    function shouldIgnore(event, a) {
        if (!a) return true;

        const rawHref = a.getAttribute("href");
        if (!rawHref || rawHref.startsWith("#")) return true; // same-page anchors

        // Only intercept primary-button, unmodified clicks
        if (event.button !== 0) return true;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return true;

        // Skip special schemes and downloads
        const url = a.href;
        if (isYouTubeWithTimeParam(url)) return true;

        // If "Q" key is pressed, ignore extension and let Chrome handle it
        if (ignoreKeyHeld) return true;

        if (!url) return true;
        const proto = new URL(url).protocol;
        if (proto === "mailto:" || proto === "tel:") return true;
        if (a.hasAttribute("download")) return true;

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

        // Ask background to open a new tab (more reliable than window.open from a content script)
        chrome.runtime.sendMessage({ type: "open-new-tab", url });
    }

    // Capture early, not passive, so we can preventDefault
    addEventListener("click", handleClick, { capture: true, passive: false });
})();


function isYouTubeWithTimeParam(url) {
    try {
        const parsedUrl = new URL(url);

        // Check if it's a YouTube base URL
        const isYouTube = parsedUrl.hostname === 'www.youtube.com' || parsedUrl.hostname === 'youtube.com';

        // ingore in csae of timestamp, ist
        if (isYouTube) {
            return parsedUrl.searchParams.has('t') || parsedUrl.searchParams.has('list')
        }

        return false;
    } catch (e) {
        // Invalid URL
        return false;
    }
}

