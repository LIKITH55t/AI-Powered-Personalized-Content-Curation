const $ = (id) => document.getElementById(id);
const enabledEl = $("enabled");
const siteEl = $("site");
const statsEl = $("stats");
const goalEl = $("goal");
const promptEl = $("prompt");
const modeBtns = [...document.querySelectorAll("#modes button")];
const healthEl = $("health");

let mode = "remove";
function setMode(next) {
  mode = next;
  modeBtns.forEach((b) => b.classList.toggle("active", b.dataset.mode === next));
}
modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

const DEFAULT_SETTINGS = {
  enabled: true,
  goal: "placements",
  prompt: "",
  mode: "remove",
  showScores: false,
  debug: false,
};

function showSite(text, cls) {
  siteEl.textContent = text;
  siteEl.className = "site" + (cls ? " " + cls : "");
}

function showHealth(text) {
  healthEl.textContent = text || "";
}

chrome.storage.local.get(DEFAULT_SETTINGS, (s) => {
  enabledEl.checked = s.enabled !== false;
  goalEl.value = s.goal || "placements";
  promptEl.value = s.prompt || "";
  let m = s.mode;
  if (m === "collapse" || m === "blur") m = "remove";
  setMode(m || "remove");
});

async function push(changes) {
  try {
    const s = { goal: goalEl.value, prompt: promptEl.value, mode };
    Object.assign(s, changes);
    await chrome.storage.local.set(s);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: "ORION_RESCORE" });
        showSite("✓ Updated", "ok");
      } catch {
        showSite("Tab not connected — reload it", "warn");
      }
    }
  } catch (err) {
    console.error("[ORION popup]", err);
    showSite("Something went wrong", "err");
  }
}

enabledEl.addEventListener("change", () => {
  void push({ enabled: enabledEl.checked });
  showSite(enabledEl.checked ? "Enabled" : "Paused — posts stay visible", enabledEl.checked ? "ok" : "warn");
});
goalEl.addEventListener("change", () => void push({ goal: goalEl.value }));
promptEl.addEventListener("change", () => void push({ prompt: promptEl.value }));
modeBtns.forEach((b) =>
  b.addEventListener("click", () => {
    setMode(b.dataset.mode);
    void push({ mode });
  })
);

$("openOptions").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

function platformFor(host) {
  if (/(^|\.)(x|twitter)\.com$/.test(host || "")) return "X (Twitter)";
  if (/localhost|127\.0\.0\.1/.test(host || "")) return "Demo feed";
  return null;
}

(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showSite("No active tab.", "");
      return;
    }
    const host = tab.url ? new URL(tab.url).hostname : "";
    const platform = platformFor(host);
    if (!platform) {
      showSite("Open X or the demo feed to use ORION.", "warn");
      return;
    }
    showSite(platform + " · live scoring", "ok");

    try {
      const status = await chrome.tabs.sendMessage(tab.id, { type: "ORION_STATUS" });
      if (status) {
        $("sVisible").textContent = status.counts?.visible ?? "–";
        $("sRemoved").textContent = status.counts?.removed ?? "–";
        $("sDimmed").textContent = status.counts?.dimmed ?? "–";
        statsEl.hidden = false;
        if (status.degraded) {
          showHealth("⚠ markup changed — keeping posts visible");
        } else if (!status.enabled) {
          showHealth("paused");
        }
      }
    } catch {
      showHealth("reload the tab to activate");
    }
  } catch (err) {
    console.error("[ORION popup]", err);
    showSite("Could not read tab info", "err");
  }
})();