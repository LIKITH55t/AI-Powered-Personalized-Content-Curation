async function scoreNodes(goal, prompt) {
  const nodes = [...document.querySelectorAll("[data-orion-post]")];
  if (!nodes.length) return;
  const posts = nodes.map((el) => ({
    id: el.getAttribute("data-orion-id") || el.id || crypto.randomUUID(),
    platform: el.getAttribute("data-orion-platform") || "web",
    author: el.getAttribute("data-orion-author") || "unknown",
    handle: "",
    title: el.querySelector("h3, h2")?.textContent || "",
    body: el.innerText || "",
    tags: (el.getAttribute("data-orion-tags") || "").split(",").filter(Boolean),
    type: "post",
  }));
  try {
    const res = await fetch("http://127.0.0.1:8000/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posts, goal, prompt }),
    });
    const data = await res.json();
    for (const item of data.items || []) {
      const el = nodes.find((n) => (n.getAttribute("data-orion-id") || n.id) === item.id);
      if (!el) continue;
      el.classList.toggle("orion-hidden", !item.visible);
      let badge = el.querySelector(".orion-badge");
      if (!badge) {
        badge = document.createElement("div");
        badge.className = "orion-badge";
        el.style.position = "relative";
        el.appendChild(badge);
      }
      badge.textContent = item.score;
    }
  } catch (err) {
    console.warn("ORION score failed", err);
  }
}

chrome.storage.local.get(["goal", "prompt"], (s) => {
  scoreNodes(s.goal || "placements", s.prompt || "");
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "ORION_RESCORE") scoreNodes(msg.goal, msg.prompt);
});
