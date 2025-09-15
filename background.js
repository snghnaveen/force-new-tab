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
    } catch (_) {}
  }
}

async function updateBadge(enabled) {
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? "#0bde27ff" : "#ffb9b9ff" });
}

chrome.runtime.onInstalled.addListener(async () => {
  await updateBadge(await getEnabled());

  // Create context menu for right-click on links
  chrome.contextMenus.create({
    id: "open-link-in-this-tab",
    title: "Open Link in This Tab",
    contexts: ["link"]
  });
});

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

// New context menu handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open-link-in-this-tab" && info.linkUrl) {
    chrome.tabs.update(tab.id, { url: info.linkUrl });
  }
});
