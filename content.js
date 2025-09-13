(() => {
    let enabled = true;
    let ignoreKeyHeld = false;
    let showToast = true;
    let whitelist = [];

    // === Storage syncing ===
    // Initial load
    chrome.storage.local.get({ enabled: true, whitelist: [] }, (res) => {
        enabled = !!res.enabled;
        whitelist = res.whitelist || [];
        showToast = res.showToast !== false; // default true
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

        console.log("Checking validation for link:", a.href);
        console.log("Link element:", a);
        console.log("Event:", event);
        console.log("Current whitelist:", whitelist);
        console.log("Current enabled state:", enabled);
        console.log("Toast enabled:", showToast);
        console.log("Is override key held:", ignoreKeyHeld);

        if (isSamePageAnchor(a.getAttribute("href"))) {
            console.log("Ignoring same-page anchor link");
            return true;
        }

        if (isModifiedOrNonPrimaryClick(event)) {
            console.log("Ignoring modified or non-primary click");
            return true
        };

        const url = a.href;
        if (isMissingHref(url)) {
            console.log("Ignoring missing href");
            return true;
        }

        if (hasYouTubeTimestampOrListParam(url)) {
            console.log("Ignoring YouTube link with t or list param");
            return true
        };

        if (ignoreKeyHeld) {
            console.log("Ignoring because override key held");
            return true
        };

        if (isSpecialOrDownloadLink(a, url)) {
            console.log("Ignoring special link (mailto/tel/download)");
            return true
        };

        const domain = domainFromUrl(url);
        if (!domain) return true;
        if (isDomainWhitelisted(domain, whitelist)) {
            console.log("Ignoring because domain not whitelisted");
            return true
        };

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

        if (showToast) {
            toastMessage("opened in new tab", 4000);
        }

        // Ask background to open a new tab
        chrome.runtime.sendMessage({ type: "open-new-tab", url });
    }

    // Capture early, not passive, so we can preventDefault
    addEventListener("click", handleClick, { capture: true, passive: false });
})();


function isSamePageAnchor(href) {
    return !href || href.startsWith("#");
}

function isMissingHref(url) {
    return !url;
}

// Only intercept primary-button, unmodified clicks
function isModifiedOrNonPrimaryClick(event) {
    return (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
    );
}

function isSpecialOrDownloadLink(a, url) {
    try {
        const proto = new URL(url).protocol;
        if (proto === "mailto:" || proto === "tel:") return true;
        if (a.hasAttribute("download")) return true;
        return false;
    } catch {
        // If URL parsing fails, treat as special (fail-safe)
        return true;
    }
}

function isDomainWhitelisted(domain, whitelist) {
    return whitelist.length > 0 && !whitelist.includes(domain);
}

function hasYouTubeTimestampOrListParam(target) {
    try {
        const targetUrl = new URL(target);
        const isTargetYouTubeLink = /(^|\.)youtube\.com$/.test(targetUrl.hostname.replace(/^www\./, ""));

        if (!isTargetYouTubeLink) {
            console.log("Target is not a YouTube link, ignoring YouTube timestamp or list check");
            return false;
        }

        const currentPageUrl = new URL(window.location.href);
        const isCurrentPageYouTube = /(^|\.)youtube\.com$/.test(currentPageUrl.hostname.replace(/^www\./, ""));

        if (isCurrentPageYouTube) {
            if (targetUrl.searchParams.has("t")) {
                console.log("Target link has t param, ignoring YouTube timestamp or list check");
                return true;
            }

            if (currentPageUrl.searchParams.has("list")) {
                const hasListQueryParam = targetUrl.searchParams.has("list")
                console.log("Current page has list param, checking target for list param:", hasListQueryParam);
                return hasListQueryParam;
            }


        }
        return false
    } catch {
        console.log("Error parsing URL, treating as non-YouTube link");
        return false;
    }
}
