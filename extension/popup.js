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

// Load and render prompt history from backend API
async function loadHistory() {
  const countEl = document.getElementById("history-count");
  const listEl = document.getElementById("history-list");
  if (!listEl) return;

  try {
    const res = await fetch("http://127.0.0.1:8000/api/history");
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const entries = data.entries || [];
    countEl.textContent = `(${entries.length})`;

    if (entries.length === 0) {
      listEl.innerHTML = '<div style="font-size: 11px; color: #c8c3b4; margin-top: 6px;">No prompt history yet.</div>';
      return;
    }

    listEl.innerHTML = "";
    entries.slice(0, 5).forEach((entry, idx) => {
      const card = document.createElement("div");
      card.className = "history-card";
      const stats = entry.stats || {};
      const suppressionPct = Math.round((stats.suppressionRate || 0) * 100);

      card.innerHTML = `
        <div class="history-head">
          <span class="badge-label">${entry.label}</span>
          <span class="badge">${entry.goalLabel || entry.goal}</span>
        </div>
        <div class="history-prompt">“${entry.prompt || '(Default profile)'}”</div>
        <div class="history-head">
          <div class="history-stats">
            <span>Keep: <strong style="color:#5eead4">${stats.shown ?? 0}</strong></span>
            <span>Hide: <strong style="color:#fb7185">${stats.hidden ?? 0}</strong></span>
            <span>Score: <strong style="color:#e8c36a">${stats.avgScore ?? 0}</strong></span>
          </div>
          <button type="button" class="replay-btn" data-idx="${idx}">Replay</button>
        </div>
      `;

      card.querySelector(".replay-btn").addEventListener("click", async () => {
        goalEl.value = entry.goal;
        promptEl.value = entry.prompt || "";
        goal = entry.goal;
        prompt = entry.prompt || "";

        await chrome.storage.local.set({ goal, prompt, mode });

        try {
          await fetch("http://127.0.0.1:8000/api/intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ goal, prompt }),
          });
        } catch (e) {
          console.warn("Intent update warning", e);
        }

        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          chrome.tabs.sendMessage(activeTab.id, { type: "ORION_RESCORE", goal, prompt, mode }).catch(() => {});
        }

        window.close();
      });

      listEl.appendChild(card);
    });
  } catch (err) {
    countEl.textContent = "(0)";
    listEl.innerHTML = '<div style="font-size: 11px; color: #c8c3b4; margin-top: 6px;">Start FastAPI backend to load history.</div>';
  }
}

loadHistory();

