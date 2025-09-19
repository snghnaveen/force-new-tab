/* ---------------- Event Listeners ---------------- */
document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);

/* ---------------- Helpers ---------------- */
function formatDomain(input) {
  try {
    const normalized = input.startsWith("http://") || input.startsWith("https://")
      ? input
      : `https://${input}`;
    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null; // invalid input
  }
}

function showStatusMessage(message, duration = 2000) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = message;
  setTimeout(() => (statusEl.textContent = ""), duration);
}

/* ---------------- Save Options ---------------- */
async function saveOptions() {
  const openInBackground = document.getElementById("openInBackground").checked;
  const showToast = document.getElementById("showToast").checked;

  const rawWhitelist = document
    .getElementById("whitelist")
    .value.split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const whitelist = rawWhitelist.map(formatDomain).filter(Boolean);

  await chrome.storage.local.set({ openInBackground, showToast, whitelist });
  showStatusMessage("Options saved!");
}

/* ---------------- Restore Options ---------------- */
async function restoreOptions() {
  const {
    openInBackground = false,
    showToast = true,
    whitelist = [],
  } = await chrome.storage.local.get(["openInBackground", "showToast", "whitelist"]);

  document.getElementById("openInBackground").checked = openInBackground;
  document.getElementById("showToast").checked = showToast;
  document.getElementById("whitelist").value = whitelist.join("\n");
}
