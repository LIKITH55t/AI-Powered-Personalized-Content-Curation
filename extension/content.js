(() => {
  const API = "http://127.0.0.1:8000";
  const DB = 350; // debounce ms

  function getSettings(cb) {
    chrome.storage.local.get(
      { goal: "placements", prompt: "", mode: "dim" },
      (s) => cb(s.goal || "placements", s.prompt || "", s.mode || "dim")
    );
  }

  function collectNodes() {
    return [...document.querySelectorAll("[data-orion-post]")];
  }

  function toPost(el) {
    return {
      id: el.getAttribute("data-orion-id") || el.id || crypto.randomUUID(),
      platform: el.getAttribute("data-orion-platform") || "web",
      author: el.getAttribute("data-orion-author") || "unknown",
      handle: el.getAttribute("data-orion-handle") || "",
      title:
        el.getAttribute("data-orion-title") ||
        el.querySelector("h2, h3")?.textContent ||
        "",
      body: el.innerText || "",
      tags: (el.getAttribute("data-orion-tags") || "").split(",").filter(Boolean),
      type: "post",
    };
  }

  function applyResult(el, item, mode) {
    el.classList.toggle("orion-hidden", !item.visible);

    let badge = el.querySelector(".orion-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "orion-badge";
      el.style.position = "relative";
      el.appendChild(badge);
    }
    const tone = item.score >= 75 ? "orion-good" : item.score >= 48 ? "orion-mid" : "orion-bad";
    badge.classList.remove("orion-good", "orion-mid", "orion-bad");
    badge.classList.add(tone);
    badge.textContent = item.visible ? String(item.score) : `\u2298 ${item.score}`;

    if (mode === "collapse" && !item.visible) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
  }

  // Track backend availability to avoid spamming failed fetch calls.
  let backendAvailable = true;
  let backendRetryTimer = null;

  function scheduleBackendRetry() {
    if (backendRetryTimer) return;
    backendRetryTimer = setTimeout(async () => {
      backendRetryTimer = null;
      try {
        const res = await fetch(`${API}/api/health`, { method: "GET" });
        if (res.ok) {
          backendAvailable = true;
          console.debug("[ORION] Backend is back online.");
        }
      } catch {
        // Still offline — will retry on the next trigger.
      }
    }, 15000);
  }

  async function score(nodes, goal, prompt, mode) {
    if (!nodes.length) return;
    // Skip silently when the backend is known to be offline.
    if (!backendAvailable) return;
    const posts = nodes.map(toPost);
    try {
      const res = await fetch(`${API}/api/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts, goal, prompt }),
      });
      if (!res.ok) return;
      const data = await res.json();
      for (const item of data.items || []) {
        const el = nodes.find((n) => (n.getAttribute("data-orion-id") || n.id) === item.id);
        if (el) applyResult(el, item, mode);
      }
    } catch (err) {
      // console.debug (not warn) so Chrome does NOT surface this as a red
      // error in chrome://extensions when the local backend is simply offline.
      console.debug("[ORION] Backend unavailable, scoring paused.", err?.message);
      backendAvailable = false;
      scheduleBackendRetry();
    }
  }

  let timer = null;

  function rescore(goal, prompt, mode, force) {
    const nodes = collectNodes().filter((n) => force || !n.dataset.orionScored);
    if (!nodes.length) return;
    nodes.forEach((n) => (n.dataset.orionScored = "1"));
    void score(nodes, goal, prompt, mode);
  }

  function schedule(goal, prompt, mode) {
    clearTimeout(timer);
    timer = setTimeout(() => rescore(goal, prompt, mode), DB);
  }

  function init() {
    getSettings((goal, prompt, mode) => {
      rescore(goal, prompt, mode, true);

      const mo = new MutationObserver(() => {
        const needs = collectNodes().filter(
          (n) => !n.dataset.orionScored || n.getAttribute("hidden") || n.classList.contains("orion-hidden")
        );
        if (needs.length) schedule(goal, prompt, mode);
      });
      mo.observe(document.body, { childList: true, subtree: true });

      window.addEventListener("__orion_settings", () => window.location.reload());
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "ORION_RESCORE") {
      // New intent applied from popup — reset backend flag so scoring retries.
      backendAvailable = true;
      getSettings((goal, prompt, mode) => {
        rescore(msg.goal || goal, msg.prompt !== undefined ? msg.prompt : prompt, msg.mode || mode, true);
      });
    }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
