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
    badge.textContent = item.visible ? String(item.score) : `⊘ ${item.score}`;

    if (mode === "collapse" && !item.visible) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
  }

  async function score(nodes, goal, prompt, mode) {
    if (!nodes.length) return;
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
      console.warn("ORION score failed", err);
    }
  }

  let timer = null;

  // Rescore in two passes so every [data-orion-post] node gets a score.
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
        // only bother if genuinely new (unscored) post nodes appeared
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
      getSettings((goal, prompt, mode) => {
        rescore(msg.goal || goal, msg.prompt !== undefined ? msg.prompt : prompt, msg.mode || mode, true);
      });
    }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
