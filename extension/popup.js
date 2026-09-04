const goalEl = document.getElementById("goal");
const promptEl = document.getElementById("prompt");
const statusEl = document.getElementById("status");
const modeBtns = [...document.querySelectorAll(".mode")];

let goal = "placements";
let prompt = "";
let mode = "dim";

function setMode(next) {
  mode = next;
  modeBtns.forEach((b) => b.classList.toggle("active", b.dataset.mode === next));
}

function platformFor(host) {
  if (/(^|\.)(x|twitter)\.com$/.test(host || "")) return "X (Twitter)";
  if (/localhost|127\.0\.0\.1/.test(host || "")) return "Demo feed";
  return host || "unknown";
}

modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

chrome.storage.local.get({ goal: "placements", prompt: "", mode: "dim" }, (s) => {
  goalEl.value = s.goal || "placements";
  promptEl.value = s.prompt || "";
  setMode(s.mode || "dim");
});

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab) {
    statusEl.textContent = "No active tab.";
    return;
  }
  const platform = platformFor(tab.url ? new URL(tab.url).hostname : "");
  statusEl.textContent =
    platform === "X (Twitter)"
      ? "✓ Active: live X tweets will be scored"
      : platform === "Demo feed"
      ? "✓ Active: scoring the local demo feed"
      : `Open X or the demo feed to score (now: ${platform})`;

  if (!(platform === "X (Twitter)" || platform === "Demo feed")) {
    statusEl.style.color = "#c8c3b4";
  }
});

document.getElementById("save").addEventListener("click", async () => {
  goal = goalEl.value;
  prompt = promptEl.value;
  await chrome.storage.local.set({ goal, prompt, mode });
  try {
    await fetch("http://127.0.0.1:8000/api/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, prompt }),
    });
  } catch (e) {
    console.warn(e);
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "ORION_RESCORE", goal, prompt, mode }).catch(() => {});
  }
  window.close();
});
