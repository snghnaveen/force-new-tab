// background.js (MV3 service worker, module)
const KEY = "enabled";

async function getEnabled() {
  const { enabled = true } = await chrome.storage.local.get(KEY);
  return enabled;
}

async function setEnabled(enabled) {
  await chrome.storage.local.set({ [KEY]: enabled });
  await updateBadge(enabled);
  // Notify all tabs so their content script updates immediately
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      chrome.tabs.sendMessage(tab.id, { type: "set-enabled", enabled });
    } catch (_) {
      // ignore tabs without our content script (e.g., chrome://, Web Store, etc.)
    }
  }
}

async function updateBadge(enabled) {
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "" });
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? "#0bde27ff" : "#ffb9b9ff" });
}

// Initialize badge on install/startup
chrome.runtime.onInstalled.addListener(async () => updateBadge(await getEnabled()));
chrome.runtime.onStartup.addListener(async () => updateBadge(await getEnabled()));

// Toggle by clicking the toolbar icon
chrome.action.onClicked.addListener(async () => setEnabled(!(await getEnabled())));

// Toggle by keyboard shortcut
chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd === "toggle-force-newtab") {
    await setEnabled(!(await getEnabled()));
  }
});

// Handle requests from content script to open a new tab
chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg?.type === "open-new-tab" && typeof msg.url === "string") {
    const { openInBackground = false } = await chrome.storage.local.get("openInBackground");
    chrome.tabs.create({
      url: msg.url,
      active: !openInBackground,
      index: sender.tab ? sender.tab.index + 1 : undefined,
      openerTabId: sender.tab?.id
    });
  }
});

