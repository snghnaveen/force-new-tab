(() => {
    /* ---------------- State ---------------- */
    let enabled = true;
    let ignoreKeyHeld = false;
    let showToast = true;
    let ytHandling = true;
    let whitelist = [];

    /* ---------------- Storage ---------------- */
    chrome.storage.local.get({ enabled: true, whitelist: [], showToast: true, ytHandling: true }, (res) => {
        enabled = !!res.enabled;
        whitelist = res.whitelist || [];
        showToast = res.showToast !== false;
        ytHandling = res.ytHandling !== false;
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (changes.enabled) enabled = !!changes.enabled.newValue;
        if (changes.whitelist) whitelist = changes.whitelist.newValue || [];
        if (changes.showToast) showToast = changes.showToast.newValue !== false;
        if (changes.ytHandling) ytHandling = changes.ytHandling.newValue !== false;
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.type === "set-enabled") {
            enabled = !!msg.enabled;
        }

        if (msg?.type === "show-toast" &&
            showToast &&
            typeof toastMessage === "function") {
            toastMessage(msg.message, 4000);
        }
    });

    /* ---------------- Keyboard Handling ---------------- */
    addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "`") ignoreKeyHeld = true;
    });

    addEventListener("keyup", (e) => {
        if (e.key.toLowerCase() === "`") ignoreKeyHeld = false;
    });

    /* ---------------- Helpers ---------------- */
    function findAnchorFromEvent(event) {
        const path = typeof event.composedPath === "function" ? event.composedPath() : [];
        for (const el of path) {
            if (el?.tagName === "A" && el.href) return el;
        }
        return event.target?.closest?.("a[href]") ?? null;
    }

    function domainFromUrl(url) {
        try {
            return new URL(url).hostname.replace(/^www\./, "");
        } catch {
            return null;
        }
    }

    const isSamePageAnchor = (href) => !href || href.startsWith("#");
    const isMissingHref = (url) => !url;

    function isModifiedOrNonPrimaryClick(event) {
        return (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        );
    }

    function isSpecialOrDownloadLink(anchor, url) {
        try {
            const proto = new URL(url).protocol;
            return proto === "mailto:" || proto === "tel:" || anchor.hasAttribute("download");
        } catch {
            return true; // fail-safe: treat as special if parsing fails
        }
    }

    function isDomainBlocked(domain, whitelist) {
        return whitelist.length > 0 && !whitelist.includes(domain);
    }

    function hasYouTubeTimestampOrListParam(targetUrlString) {
        if (!ytHandling) return false;
        try {
            const targetUrl = new URL(targetUrlString);
            const isYouTube = /(^|\.)youtube\.com$/.test(targetUrl.hostname.replace(/^www\./, ""));
            if (!isYouTube) return false;

            const currentUrl = new URL(window.location.href);
            const isCurrentYouTube = /(^|\.)youtube\.com$/.test(currentUrl.hostname.replace(/^www\./, ""));

            if (!isCurrentYouTube) return false;

            if (targetUrl.searchParams.has("t")) return true;

            if (currentUrl.searchParams.has("list")) {
                return targetUrl.searchParams.has("list");
            }

            return false;
        } catch {
            return false;
        }
    }

    function shouldIgnore(event, anchor) {
        if (!anchor) return true;
        const href = anchor.getAttribute("href");

        if (isSamePageAnchor(href)) return true;
        if (isModifiedOrNonPrimaryClick(event)) return true;

        const url = anchor.href;
        if (isMissingHref(url)) return true;
        if (hasYouTubeTimestampOrListParam(url)) return true;
        if (ignoreKeyHeld) return true;
        if (isSpecialOrDownloadLink(anchor, url)) return true;

        const domain = domainFromUrl(url);
        if (!domain) return true;
        if (isDomainBlocked(domain, whitelist)) return true;

        return false;
    }

    /* ---------------- Click Handling ---------------- */
    function handleClick(event) {
        if (!enabled || event.defaultPrevented) return;

        const anchor = findAnchorFromEvent(event);
        if (shouldIgnore(event, anchor)) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();

        if (showToast && typeof toastMessage === "function") {
            toastMessage("opened in new tab", 4000);
        }

        chrome.runtime.sendMessage({ type: "open-new-tab", url: anchor.href });
    }

    // Capture early, not passive, so we can preventDefault
    addEventListener("click", handleClick, { capture: true, passive: false });
})();
