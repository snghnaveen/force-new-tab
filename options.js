document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);

async function saveOptions() {
    const openInBackground = document.getElementById("openInBackground").checked;
    const whitelist = document.getElementById("whitelist").value
        .split("\n").map(s => s.trim()).filter(Boolean);
    const blacklist = document.getElementById("blacklist").value
        .split("\n").map(s => s.trim()).filter(Boolean);

    await chrome.storage.local.set({ openInBackground, whitelist, blacklist });

    const status = document.getElementById("status");
    status.textContent = "Options saved!";
    setTimeout(() => (status.textContent = ""), 2000);
}

async function restoreOptions() {
    const { openInBackground = false, whitelist = [], blacklist = [] } =
        await chrome.storage.local.get(["openInBackground", "whitelist"]);

    document.getElementById("openInBackground").checked = openInBackground;
    document.getElementById("whitelist").value = whitelist.join("\n");
}
