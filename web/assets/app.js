const app = document.getElementById("app");
const state = {
  view: "landing",
  tab: "feed",
  step: 0,
  goal: "placements",
  prompt:
    "I am targeting SDE internships. Show DSA, system design, and resume help. Hide memes, politics, and celebrity content.",
  intent: null,
  items: [],
  analytics: null,
  insights: null,
  showHidden: false,
  busy: false,
  note: "",
  profile: null,
};

function go(view, extra = {}) {
  Object.assign(state, extra, { view });
  render();
  window.scrollTo(0, 0);
}

function logo() {
  return `<a class="brand" href="#/" data-nav="landing">
    <div class="mark">✦</div>
    <div><b>ORION</b><small>Goal-Based Feed</small></div>
  </a>`;
}

function landing() {
  return `
    <header class="nav">
      ${logo()}
      <div class="nav-links">
        <a href="#how">How it works</a>
        <a href="#features">Engine</a>
        <a href="#impact">Impact</a>
        <a href="#/app" data-nav="app">Live demo</a>
      </div>
      <button class="btn" data-nav="start">Set your intent</button>
    </header>
    <section class="hero">
      <div>
        <div class="kicker">Team Orion · SIH prototype</div>
        <h1>Your feed, finally <em>on purpose.</em></h1>
        <p class="lede">ORION turns noisy social timelines into a goal-shaped stream. Speak your intent. Hide the rest. Learn, place, or prepare — without drowning in engagement bait.</p>
        <div class="cta">
          <button class="btn" data-nav="start">Start with a goal</button>
          <button class="btn ghost" data-nav="app">Open live feed</button>
        </div>
        <div class="stats">
          <div><strong>10</strong>posts per batch</div>
          <div><strong>3</strong>goal modes</div>
          <div><strong>4</strong>platforms in roadmap</div>
        </div>
      </div>
      <div class="glass preview">
        <div class="meta" style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span>Intent · Placements</span><span style="color:var(--teal)">Scoring live</span>
        </div>
        <p>“Show DSA, system design, and resume help. Hide memes and celebrity drama.”</p>
        <div class="row ok"><span>DP Playlist — Placement Series</span><b>92</b></div>
        <div class="row ok"><span>Microsoft SDE-1 offer notes</span><b>88</b></div>
        <div class="row no"><span>Wait for it 💀 #fail</span><b>12</b></div>
        <div class="row no"><span>Celebrity award-show votes</span><b>8</b></div>
      </div>
    </section>
    <section class="section" id="how">
      <h2>Pipeline flow</h2>
      <p class="muted">Hide. Prompt → Interpreter → Criteria → Batch → Classification → CSS.</p>
      <div class="grid-6">
        ${["User prompt","Interpreter","Criteria","Batch of 10","LLM classify","CSS hide"].map((s,i)=>`
          <div class="glass step"><span>0${i+1}</span><div>${s}</div></div>`).join("")}
      </div>
    </section>
    <section class="section" id="features">
      <h2>The engine</h2>
      <div class="grid-3">
        ${[
          ["Goal-Based Feed","Lock onto Placements, Competitive Exams, or Skill Learning. The feed inherits those objectives as filtering parameters."],
          ["AI Intent Understanding","Natural-language prompts map what you want, what you care about, and what should never appear."],
          ["Smart Content Analysis","Incoming posts, articles, and videos are scanned for themes, topics, and metadata before they reach your eyes."],
          ["Relevance Scoring","Every item gets a multi-variable match score against your active goal, interests, and exclusions."],
          ["Intelligent Filtering","Off-topic and low-value material is suppressed. High-value educational resources surface first."],
          ["Dynamic Intent","Switch goals on the fly. The curation engine re-optimizes the stream without a reload ritual."],
        ].map(([t,b])=>`<div class="glass card"><h3>${t}</h3><p class="muted">${b}</p></div>`).join("")}
      </div>
    </section>
    <section class="section" id="impact">
      <div class="glass card">
        <h2>Built for attention that compounds</h2>
        <p class="muted" style="max-width:640px">Students, professionals, and researchers get a user-controlled alternative to opaque, engagement-driven ranking. Freemium filtering today; deeper personalization and campus licenses tomorrow.</p>
        <div class="grid-3" style="margin-top:28px">
          <div><h3>Technical</h3><p class="muted">FastAPI, semantic-style scoring, DOM-independent demo corpus, Chrome extension shell.</p></div>
          <div><h3>Economic</h3><p class="muted">Open-source stack, intent caching, student-affordable infrastructure.</p></div>
          <div><h3>Regulatory</h3><p class="muted">User-owned criteria instead of black-box recommendation lock-in.</p></div>
        </div>
      </div>
    </section>
    <footer class="footer">Team Orion · Smart India Hackathon · Research: Bonsai, Flowstate, Algoright, AI Filter, Bouncer</footer>
  `;
}

function onboarding() {
  const goals = [
    ["placements", "Placements", "DSA, internships, resumes, system design. Quiet the memes."],
    ["exams", "Competitive Exams", "UPSC, JEE, NEET, GATE. PYQs, revision, current affairs."],
    ["skills", "Skill Learning", "Courses, tutorials, deep dives. Skip outrage and gossip."],
  ];
  return `
    <header class="nav">${logo()}<span class="muted">Step ${state.step + 1} of 2</span></header>
    <div class="narrow">
      ${
        state.step === 0
          ? `<h1 class="display" style="font-size:42px">What should this season of your feed serve?</h1>
             <p class="muted">Pick a primary goal. You can switch anytime — the engine re-ranks live.</p>
             <div class="goal-pick">
               ${goals
                 .map(
                   ([id, t, c]) => `<button class="glass ${state.goal === id ? "on" : ""}" data-goal="${id}">
                     <b>${t}</b><div class="muted" style="margin-top:6px">${c}</div></button>`
                 )
                 .join("")}
             </div>
             <button class="btn" style="margin-top:22px" data-next="1">Continue</button>`
          : `<h1 class="display" style="font-size:42px">Say it in plain language.</h1>
             <p class="muted">ORION extracts interests and exclusions from your prompt. No filter matrices required.</p>
             <textarea id="prompt">${escapeHtml(state.prompt)}</textarea>
             <div style="display:flex;gap:10px;margin-top:18px">
               <button class="btn ghost" data-next="0">Back</button>
               <button class="btn" data-finish="1"${state.busy ? " disabled" : ""}>${state.busy ? "Curating…" : "Open my feed"}</button>
             </div>`
      }
    </div>`;
}

function postCard(item) {
  const tone = item.score >= 75 ? "var(--teal)" : item.score >= 48 ? "var(--gold)" : "var(--rose)";
  return `<article class="glass post ${item.visible ? "" : "dim"}" data-orion-post data-orion-id="${item.id}" data-orion-platform="${item.platform}" data-orion-tags="${(item.tags || []).join(",")}">
    <div style="display:flex;justify-content:space-between;gap:12px">
      <div>
        <div class="meta">${item.platform} · ${item.type}${item.duration ? " · " + item.duration : ""}</div>
        <div style="margin-top:8px;font-weight:650">${escapeHtml(item.author || "")}</div>
        <div class="muted" style="font-size:12px">${escapeHtml(item.handle || "")}</div>
      </div>
      <div class="score" style="color:${tone}">${item.score}</div>
    </div>
    ${item.title ? `<h3 style="margin:14px 0 6px;font-size:18px;font-family:Outfit,sans-serif">${escapeHtml(item.title)}</h3>` : ""}
    <p class="muted" style="font-size:14px;line-height:1.55">${escapeHtml(item.body || "")}</p>
    <div class="pills">${(item.tags || []).slice(0, 4).map((t) => `<span class="chip" style="background:rgba(255,255,255,.05)">${escapeHtml(t)}</span>`).join("")}</div>
    <div class="muted" style="font-size:12px">${(item.reasons || []).join(" · ")}</div>
    <div class="actions">
      ${["click:Open", "like:Like", "save:Save", "skip:Skip", "hide:Hide"]
        .map((p) => {
          const [id, label] = p.split(":");
          return `<button data-act="${id}" data-id="${item.id}">${label}</button>`;
        })
        .join("")}
    </div>
  </article>`;
}

function appShell(inner) {
  const tabs = [
    ["feed", "Feed"],
    ["goals", "Goals"],
    ["insights", "Insights"],
    ["platforms", "Platforms"],
  ];
  return `
    <div class="shell">
      <aside class="side">
        ${logo()}
        <nav style="margin-top:18px">
          ${tabs.map(([id, l]) => `<button class="${state.tab === id ? "active" : ""}" data-tab="${id}">${l}</button>`).join("")}
        </nav>
        <p class="muted" style="font-size:12px;padding:16px 10px">Adaptive weights update from likes, saves, clicks, and skips.</p>
      </aside>
      <div class="main">${inner}</div>
    </div>`;
}

function feedView() {
  const shown = state.showHidden ? state.items : state.items.filter((p) => p.visible);
  const hidden = state.items.filter((p) => !p.visible);
  const a = state.analytics;
  return `
    <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:end">
      <div>
        <h1 class="display" style="font-size:40px;margin:0">Curated stream</h1>
        <p class="muted">${state.intent?.summary || "Loading intent criteria…"}</p>
      </div>
      ${
        a
          ? `<div class="statrow">
              <div class="glass stat"><span class="meta">Shown</span><b>${a.shown}</b></div>
              <div class="glass stat"><span class="meta">Hidden</span><b>${a.hidden}</b></div>
              <div class="glass stat"><span class="meta">Avg score</span><b>${a.avgScore}</b></div>
            </div>`
          : ""
      }
    </div>
    <div class="pills">
      ${[
        ["placements", "Placements"],
        ["exams", "Competitive Exams"],
        ["skills", "Skill Learning"],
      ]
        .map(([id, l]) => `<button class="pill ${state.goal === id ? "on" : ""}" data-goal="${id}">${l}</button>`)
        .join("")}
      <button class="pill" data-toggle-hidden="1">${state.showHidden ? "Focus on matches" : "Reveal suppressed"}</button>
    </div>
    <textarea id="prompt">${escapeHtml(state.prompt)}</textarea>
    <button class="btn" style="margin-top:12px" data-reintent="1">Re-interpret intent</button>
    ${
      state.intent
        ? `<div class="pills">${(state.intent.interests || [])
            .slice(0, 6)
            .map((t) => `<span class="chip in">+ ${escapeHtml(t)}</span>`)
            .join("")}${(state.intent.exclusions || [])
            .slice(0, 5)
            .map((t) => `<span class="chip out">− ${escapeHtml(t)}</span>`)
            .join("")}</div>`
        : ""
    }
    ${state.busy || state.note ? `<p style="color:var(--gold)">${state.note || "Scoring batch of 10…"}</p>` : ""}
    <div class="feed">${shown.map(postCard).join("")}</div>
    ${!state.showHidden && hidden.length ? `<p class="muted" style="text-align:center;margin-top:28px">${hidden.length} items suppressed as off-topic or low-value.</p>` : ""}
  `;
}

function goalsView() {
  return `
    <h1 class="display" style="font-size:40px">Goals & intent</h1>
    <p class="muted" style="max-width:640px">Dynamic intent: changing a goal rewrites the criteria the scorer uses. Adaptive personalization still applies via likes, saves, and skips.</p>
    <div class="grid-3">
      ${[
        ["placements", "Placements", "Internships, OA patterns, resumes, system design, CS fundamentals."],
        ["exams", "Competitive Exams", "UPSC / JEE / NEET / GATE — PYQ, revision, current affairs."],
        ["skills", "Skill Learning", "Courses, tutorials, engineering craft. No brainrot, no outrage panels."],
      ]
        .map(
          ([id, t, d]) =>
            `<button class="glass card ${state.goal === id ? "on" : ""}" data-goal="${id}" style="text-align:left;cursor:pointer;color:inherit"><b>${t}</b><p class="muted">${d}</p></button>`
        )
        .join("")}
    </div>
    <p class="muted" style="margin-top:28px">Natural-language objective</p>
    <textarea id="prompt">${escapeHtml(state.prompt)}</textarea>
    <button class="btn" style="margin-top:14px" data-apply-goal="1">Apply to feed</button>
  `;
}

function insightsView() {
  const d = state.insights;
  if (!d) return `<p class="muted">${state.note || "Computing personalization weights…"}</p>`;
  const a = d.analytics;
  const fb = a.feedback || {};
  const maxW = Math.max(0.2, ...(a.topWeights || []).map((w) => Math.abs(w.weight)));
  return `
    <h1 class="display" style="font-size:40px">Adaptive personalization</h1>
    <p class="muted" style="max-width:640px">Implicit and explicit signals reshape tag weights. The next batch of 10 is scored with those weights already applied.</p>
    <div class="tiles">
      <div class="glass card"><div class="meta">Suppression rate</div><div style="font-size:28px;margin-top:8px">${Math.round(a.suppressionRate * 100)}%</div></div>
      <div class="glass card"><div class="meta">Shown / hidden</div><div style="font-size:28px;margin-top:8px">${a.shown} / ${a.hidden}</div></div>
      <div class="glass card"><div class="meta">Average match</div><div style="font-size:28px;margin-top:8px">${a.avgScore}</div></div>
      <div class="glass card"><div class="meta">Signals logged</div><div style="font-size:28px;margin-top:8px">${Object.values(fb).reduce((s, n) => s + n, 0)}</div></div>
    </div>
    <div class="grid-3" style="grid-template-columns:1fr 1fr">
      <div class="glass card">
        <h3>Feedback loop</h3>
        ${Object.entries(fb)
          .map(
            ([k, v]) =>
              `<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;font-size:14px;text-transform:capitalize"><span>${k}</span><span class="muted">${v}</span></div><div class="bar"><i style="width:${Math.min(100, v * 12)}%"></i></div></div>`
          )
          .join("")}
      </div>
      <div class="glass card">
        <h3>Tag weights</h3>
        ${(a.topWeights || []).length === 0 ? `<p class="muted">Like or skip items in the feed to grow this chart.</p>` : ""}
        ${(a.topWeights || [])
          .map(
            (w) =>
              `<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;font-size:14px"><span>${escapeHtml(w.tag)}</span><span style="color:${w.weight >= 0 ? "var(--teal)" : "var(--rose)"}">${w.weight}</span></div><div class="bar"><i style="width:${(Math.abs(w.weight) / maxW) * 100}%;background:${w.weight >= 0 ? "var(--teal)" : "var(--rose)"}"></i></div></div>`
          )
          .join("")}
      </div>
    </div>
    <div class="glass card" style="margin-top:16px">
      <h3>Platform split</h3>
      <div class="tiles">
        ${Object.entries(d.platforms || {})
          .map(
            ([name, v]) =>
              `<div style="background:rgba(0,0,0,.3);border-radius:16px;padding:14px"><div style="text-transform:capitalize">${escapeHtml(name)}</div><div class="muted" style="font-size:12px;margin-top:6px">${v.shown} kept · ${v.hidden} hidden</div></div>`
          )
          .join("")}
      </div>
    </div>`;
}

function platformsView() {
  return `
    <h1 class="display" style="font-size:40px">Cross-platform expansion</h1>
    <p class="muted" style="max-width:640px">Modular architecture: one intent interpreter, one scorer, many surface adapters. The Chrome extension is the non-intrusive hide layer.</p>
    <div class="feed">
      ${[
        ["YouTube", "Demo corpus + extension target", "DOM observer hides off-intent videos via CSS without touching YouTube’s backend."],
        ["X (Twitter)", "Demo corpus live", "Natural-language criteria applied to posts in batches of 10."],
        ["Reddit", "Modular adapter", "Thread titles and bodies scored with the same intent vector."],
        ["LinkedIn", "Roadmap", "Hiring spam and engagement bait suppressed; career writing kept."],
      ]
        .map(
          ([n, s, d]) =>
            `<div class="glass card"><div class="meta">${s}</div><h2 style="margin:8px 0">${n}</h2><p class="muted">${d}</p></div>`
        )
        .join("")}
    </div>
    <div class="glass card" style="margin-top:16px">
      <b>Load unpacked extension</b>
      <ol class="muted"><li>Open chrome://extensions and enable Developer mode.</li><li>Load unpacked → select the project’s extension folder.</li><li>Keep this app running so scoring can reach FastAPI.</li></ol>
    </div>`;
}

function render() {
  if (state.view === "landing") app.innerHTML = landing();
  else if (state.view === "start") app.innerHTML = onboarding();
  else {
    const inner =
      state.tab === "goals"
        ? goalsView()
        : state.tab === "insights"
          ? insightsView()
          : state.tab === "platforms"
            ? platformsView()
            : feedView();
    app.innerHTML = appShell(inner);
  }
  bind();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadFeed() {
  state.busy = true;
  state.note = "Scoring batch of 10…";
  render();
  try {
    const q = new URLSearchParams({ goal: state.goal, prompt: state.prompt });
    const data = await api(`/api/feed?${q}`);
    state.intent = data.intent;
    state.items = data.items;
    state.analytics = data.analytics;
    state.goal = data.intent.goal;
    if (data.intent.prompt && !state.prompt) state.prompt = data.intent.prompt;
    state.note = "";
  } catch (e) {
    state.note = "Could not reach the scoring API.";
  }
  state.busy = false;
  render();
}

async function loadInsights() {
  try {
    state.insights = await api("/api/insights");
  } catch (e) {
    state.note = "Could not load insights.";
  }
  render();
}

function bind() {
  app.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const v = el.getAttribute("data-nav");
      if (v === "app") {
        go("app", { tab: "feed" });
        loadFeed();
      } else go(v);
    });
  });
  app.querySelectorAll("[data-goal]").forEach((el) => {
    el.addEventListener("click", () => {
      state.goal = el.getAttribute("data-goal");
      if (state.view === "app" && state.tab === "feed") loadFeed();
      else render();
    });
  });
  app.querySelectorAll("[data-next]").forEach((el) => {
    el.addEventListener("click", () => {
      const ta = document.getElementById("prompt");
      if (ta) state.prompt = ta.value;
      state.step = Number(el.getAttribute("data-next"));
      render();
    });
  });
  app.querySelector("[data-finish]")?.addEventListener("click", async () => {
    const ta = document.getElementById("prompt");
    if (ta) state.prompt = ta.value;
    state.busy = true;
    render();
    try {
      await api("/api/profile", { method: "POST", body: { goal: state.goal, prompt: state.prompt, name: "Aanya" } });
      await api("/api/intent", { method: "POST", body: { goal: state.goal, prompt: state.prompt } });
    } catch (_) {}
    go("app", { tab: "feed", busy: false });
    loadFeed();
  });
  app.querySelectorAll("[data-tab]").forEach((el) => {
    el.addEventListener("click", () => {
      state.tab = el.getAttribute("data-tab");
      if (state.tab === "insights") loadInsights();
      else render();
    });
  });
  app.querySelector("[data-toggle-hidden]")?.addEventListener("click", () => {
    state.showHidden = !state.showHidden;
    render();
  });
  app.querySelector("[data-reintent]")?.addEventListener("click", async () => {
    const ta = document.getElementById("prompt");
    if (ta) state.prompt = ta.value;
    try {
      await api("/api/intent", { method: "POST", body: { goal: state.goal, prompt: state.prompt } });
    } catch (_) {}
    loadFeed();
  });
  app.querySelector("[data-apply-goal]")?.addEventListener("click", async () => {
    const ta = document.getElementById("prompt");
    if (ta) state.prompt = ta.value;
    try {
      await api("/api/profile", { method: "POST", body: { goal: state.goal, prompt: state.prompt } });
    } catch (_) {}
    state.tab = "feed";
    loadFeed();
  });
  app.querySelectorAll("[data-act]").forEach((el) => {
    el.addEventListener("click", async () => {
      try {
        const data = await api("/api/feedback", {
          method: "POST",
          body: { postId: el.getAttribute("data-id"), action: el.getAttribute("data-act") },
        });
        state.items = data.items;
        state.analytics = data.analytics;
        render();
      } catch (_) {}
    });
  });
}

window.addEventListener("hashchange", () => {
  if (location.hash === "#/app") {
    go("app", { tab: "feed" });
    loadFeed();
  } else if (location.hash === "#/start") go("start");
  else if (location.hash === "#/" || location.hash === "") go("landing");
});

if (location.hash === "#/app") {
  go("app", { tab: "feed" });
  loadFeed();
} else if (location.hash === "#/start") go("start");
else render();
