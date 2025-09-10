document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);

function formatDomain(input) {
    try {
        const url = input.startsWith("http://") || input.startsWith("https://")
            ? input
            : `https://${input}`;
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, "").toLowerCase();
    } catch {
        return null;
    }
}

async function saveOptions() {
    const openInBackground = document.getElementById("openInBackground").checked;

    const rawWhitelist = document.getElementById("whitelist").value
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean);

    // Format each domain and filter out invalid entries (nulls)
    const whitelistFiltered = rawWhitelist
        .map(formatDomain)
        .filter(domain => domain !== null);

    await chrome.storage.local.set({ openInBackground, whitelist: whitelistFiltered });

    const status = document.getElementById("status");
    status.textContent = "Options saved!";
    setTimeout(() => (status.textContent = ""), 2000);
}

async function restoreOptions() {
    const { openInBackground = false, whitelist = [] } =
        await chrome.storage.local.get(["openInBackground", "whitelist"]);

    document.getElementById("openInBackground").checked = openInBackground;
    document.getElementById("whitelist").value = whitelist.join("\n");
}

