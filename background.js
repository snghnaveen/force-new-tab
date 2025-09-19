const STORAGE_KEYS = {
  ENABLED: "enabled",
  OPEN_IN_BACKGROUND: "openInBackground",
};

const BADGE_COLORS = {
  ON: "#0bde27ff",
  OFF: "#ffb9b9ff",
};

const CONTEXT_MENU = {
  OPEN_LINK_THIS_TAB: "open-link-in-this-tab",
};

/* ---------------- Storage ---------------- */
async function getEnabled() {
  const { [STORAGE_KEYS.ENABLED]: enabled = true } = await chrome.storage.local.get(STORAGE_KEYS.ENABLED);
  return enabled;
}

async function setEnabled(enabled) {
  await chrome.storage.local.set({ [STORAGE_KEYS.ENABLED]: enabled });
  await updateBadge(enabled);
  notifyContentScripts(enabled);
}

/* ---------------- Badge ---------------- */
async function updateBadge(enabled) {
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? BADGE_COLORS.ON : BADGE_COLORS.OFF });
}

/* ---------------- Notifications ---------------- */
async function notifyContentScripts(enabled) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type: "set-enabled", enabled }).catch(() => {});
  }
}

/* ---------------- Context Menus ---------------- */
function createContextMenus() {
  chrome.contextMenus.create({
    id: CONTEXT_MENU.OPEN_LINK_THIS_TAB,
    title: "Open Link in This Tab",
    contexts: ["link"],
  });
}

function handleContextMenuClick(info, tab) {
  if (info.menuItemId === CONTEXT_MENU.OPEN_LINK_THIS_TAB && info.linkUrl) {
    chrome.tabs.update(tab.id, { url: info.linkUrl });
  }
}

/* ---------------- Event Handlers ---------------- */
chrome.runtime.onInstalled.addListener(async () => {
  await updateBadge(await getEnabled());
  createContextMenus();
});

chrome.runtime.onStartup.addListener(async () => {
  await updateBadge(await getEnabled());
});

chrome.action.onClicked.addListener(async () => {
  await setEnabled(!(await getEnabled()));
});

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd === "toggle-force-newtab") {
    await setEnabled(!(await getEnabled()));
  }
});

chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg?.type === "open-new-tab" && typeof msg.url === "string") {
    const { [STORAGE_KEYS.OPEN_IN_BACKGROUND]: openInBackground = false } =
      await chrome.storage.local.get(STORAGE_KEYS.OPEN_IN_BACKGROUND);

    chrome.tabs.create({
      url: msg.url,
      active: !openInBackground,
      index: sender.tab ? sender.tab.index + 1 : undefined,
      openerTabId: sender.tab?.id,
    });
  }
});

chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
