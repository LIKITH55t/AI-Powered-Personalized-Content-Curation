/**
 * ORION content script — fully self-contained, no Web Worker dependency.
 *
 * All scoring logic is inlined here so the extension works reliably
 * across all Chrome versions without module Worker issues.
 */
(() => {
  "use strict";

  // ============================================================
  //  SCORING ENGINE (inlined from rules.js + scoring-engine.js)
  // ============================================================

  const GOAL_PROFILES = {
    placements: {
      label: "Placements",
      include: [
        "dsa", "interview", "placement", "resume", "internship", "oa",
        "system design", "leetcode", "sde", "offer", "ats", "graphs",
        "dynamic programming", "dbms", "operating systems", "sql",
        "product company", "off campus", "mock interview",
      ],
      exclude: ["meme", "gossip", "crypto", "shorts", "brainrot", "giveaway"],
    },
    exams: {
      label: "Competitive Exams",
      include: [
        "upsc", "jee", "neet", "gate", "prelims", "mains", "pyq",
        "ncert", "polity", "current affairs", "physics", "chemistry",
        "biology", "ethics", "revision", "numerical", "laxmikanth",
      ],
      exclude: ["meme", "gossip", "crypto", "viral", "entertainment"],
    },
    skills: {
      label: "Skill Learning",
      include: [
        "python", "react", "javascript", "course", "tutorial", "machine learning",
        "gpt", "ui", "design", "vim", "web development", "programming",
        "skill", "learn", "from scratch",
      ],
      exclude: ["meme", "gossip", "politics", "shorts", "brainrot"],
    },
  };

  const STOPWORDS = new Set([
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with",
    "my", "i", "me", "is", "it", "from", "that", "this", "but", "no", "not",
    "want", "need", "please", "just", "some", "any", "about", "into",
  ]);

  const EXCLUDE_CUES = [
    "no ", "not ", "without ", "except ", "exclude ",
    "don't want ", "dont want ", "skip ", "hide ", "suppress ", "block ",
  ];

  const INTERESTING_TYPES = new Set(["video", "article", "thread"]);

  function tokenize(text) {
    return (text.toLowerCase().match(/[a-z0-9+#]+/g) || []).filter(
      (t) => t.length > 1 && !STOPWORDS.has(t)
    );
  }

  function uniq(items, max = 12) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
      const key = String(item).toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(String(item).trim());
        if (out.length >= max) break;
      }
    }
    return out;
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function parseIntent(prompt, goal) {
    prompt = (prompt || "").trim();
    const goalKey = GOAL_PROFILES[goal] ? goal : "placements";
    const profile = GOAL_PROFILES[goalKey];

    const include = profile.include.slice(0, 6);
    const exclude = [...profile.exclude];
    const lowered = prompt.toLowerCase();

    for (const cue of EXCLUDE_CUES) {
      if (!lowered.includes(cue)) continue;
      const after = lowered.split(cue)[1];
      if (!after) continue;
      const chunk = after.split(/[.!?\n]| but | and keep | and show /)[0];
      const parts = chunk.split(/,|\/| and | or /);
      for (const part of parts) {
        const phrase = part.trim().replace(/[ .]+$/, "");
        if (phrase.length >= 2 && phrase.length <= 40) exclude.push(phrase);
      }
    }

    let includeBlob = prompt;
    for (const cue of EXCLUDE_CUES) {
      includeBlob = includeBlob.split(new RegExp(escapeRegex(cue), "i"))[0];
    }

    const phrases = includeBlob
      .split(/,|\.| but | and /)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const phrase of phrases) {
      const tokens = tokenize(phrase);
      if (tokens.length) include.push(tokens.slice(0, 4).join(" "));
    }

    return {
      goal: goalKey,
      goalLabel: profile.label,
      interests: uniq(include),
      exclusions: uniq(exclude),
      summary: `Optimize for ${profile.label.toLowerCase()}.`,
      prompt,
    };
  }

  function countOverlap(haystack, phrases) {
    if (!phrases || !phrases.length) return 0;
    const needle = haystack.toLowerCase();
    return phrases.filter((p) => needle.includes(p.toLowerCase())).length;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function scorePost(post, intent, weights) {
    weights = weights || {};
    const blob = [
      post.title || "",
      post.body || "",
      (post.tags || []).join(" "),
      post.author || "",
    ].join(" ").toLowerCase();

    const interests = intent.interests || [];
    const exclusions = intent.exclusions || [];
    const goal = GOAL_PROFILES[intent.goal] ? intent.goal : "placements";
    const profile = GOAL_PROFILES[goal];

    const goalHits = countOverlap(blob, profile.include);
    const interestHits = countOverlap(blob, interests);
    const excludeHits = countOverlap(blob, [...exclusions, ...profile.exclude]);

    const tokens = new Set(tokenize(blob));
    const interestTokens = new Set(interests.flatMap((p) => tokenize(p)));
    const tokenHit =
      [...tokens].filter((t) => interestTokens.has(t)).length /
      Math.max(interestTokens.size, 1);

    let personal = 0;
    for (const tag of post.tags || []) personal += weights[tag] || 0;
    personal = clamp(personal / 4, -0.25, 0.25);

    const goalSig = Math.min(1, goalHits / 3);
    const interSig = Math.min(1, interestHits / 1.5);
    const tokenSig = Math.min(1, tokenHit);
    const quality = INTERESTING_TYPES.has(post.type) ? 0.06 : 0;

    const relevance =
      0.44 * goalSig + 0.32 * interSig + 0.18 * tokenSig + 0.06 * quality + personal;
    const penalty = Math.min(0.85, excludeHits) * 0.5;

    const raw = relevance - penalty - 0.26;
    let score = Math.max(0, Math.min(100, Math.round(50 + raw * 72)));
    if (excludeHits && score > 38) score = Math.min(score, 34);

    const reasons = [];
    if (goalHits) reasons.push("Aligns with " + profile.label);
    if (interestHits) reasons.push("Matches stated interests");
    if (excludeHits) reasons.push("Contains excluded themes");
    if (personal > 0.04) reasons.push("Boosted by your saves/likes");
    if (personal < -0.04) reasons.push("Downweighted from skips");
    if (!reasons.length) reasons.push("Weak topical overlap");

    return {
      score,
      visible: score >= 48,
      reasons: reasons.slice(0, 3),
    };
  }

  function applyBlocklists(post, blocklist) {
    blocklist = blocklist || {};
    const handles = (blocklist.handles || [])
      .map((h) => String(h).trim().replace(/^@/, "").toLowerCase())
      .filter(Boolean);
    const keywords = (blocklist.keywords || [])
      .map((k) => String(k).trim().toLowerCase())
      .filter((k) => k.length > 1);

    const postHandle = (post.handle || "").replace(/^@/, "").toLowerCase();
    const author = (post.author || "").toLowerCase();

    for (const handle of handles) {
      if (postHandle === handle || author.includes(handle)) {
        return { blocked: true, reason: "Blocked account: @" + handle };
      }
    }

    const blob = (post.title || " " + post.body || "").toLowerCase();
    for (const kw of keywords) {
      if (blob.includes(kw)) {
        return { blocked: true, reason: "Blocked keyword: " + kw };
      }
    }
    return { blocked: false };
  }

  function scoreAndFilter(posts, intent, weights, blocklist) {
    const results = [];
    for (const post of posts) {
      const scored = scorePost(post, intent, weights);
      const bl = applyBlocklists(post, blocklist);
      if (bl.blocked) {
        scored.score = Math.min(scored.score, 12);
        scored.visible = false;
        scored.reasons = ["Blocked by your rules"];
      } else {
        scored.reasons = scored.reasons.slice(0, 2);
      }
      results.push({ id: post.id, ...scored });
    }
    return results;
  }

  // ============================================================
  //  SETTINGS
  // ============================================================

  const DEFAULT_SETTINGS = {
    enabled: true,
    goal: "placements",
    prompt:
      "I am targeting SDE internships. Show DSA, system design, and resume help. Hide memes, politics, and celebrity content.",
    mode: "remove",
    blockedHandles: [],
    blockedKeywords: [],
    showScores: false,
    debug: false,
  };

  let settings = { ...DEFAULT_SETTINGS };

  // ============================================================
  //  LOGGER
  // ============================================================

  const _warned = new Set();
  const _log = {
    d() {},
    i() { console.log("%c[ORION]", "color:#e8c36a;font-weight:bold", ...arguments); },
    w() {
      const key = String(arguments[0]);
      if (_warned.has(key)) return;
      _warned.add(key);
      if (_warned.size > 40) _warned.clear();
      console.warn("%c[ORION]", "color:#e8c36a;font-weight:bold", ...arguments);
    },
  };

  function refreshLogger() {
    _log.d = settings.debug
      ? () => console.log("%c[ORION]", "color:#888", ...arguments)
      : () => {};
  }

  // ============================================================
  //  PER-TWEET CACHE
  // ============================================================

  const cache = new Map();
  const CACHE_MAX = 4000;
  function cacheSet(id, res) {
    cache.set(id, res);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  }

  // ============================================================
  //  DISCOVERY — find posts on the page
  // ============================================================

  function collectRecords() {
    const root = document.querySelector("main") || document;
    const adapters = (globalThis.__orionAdapters || []).filter((a) => a.isActive);
    let records = [];
    let observed = 0;
    let healthy = 0;

    if (adapters.length) {
      for (const a of adapters) {
        try {
          const r = a.collect(root);
          records = records.concat(r.records || []);
          observed += r.observed || 0;
          healthy += r.healthy || 0;
        } catch (err) {
          _log.w("adapter " + a.name + " failed", err && err.message);
        }
      }
    } else {
      // Demo corpus fallback
      for (const el of root.querySelectorAll("[data-orion-post]")) {
        const post = toGenericPost(el);
        if (!post) continue;
        if (el.dataset.orionSeen === post.id) continue;
        el.dataset.orionSeen = post.id;
        records.push({ el, post });
        observed++;
        healthy++;
      }
    }

    healthCheck(observed, healthy);
    return dedupe(records);
  }

  function toGenericPost(el) {
    const id = el.getAttribute("data-orion-id") || el.id || "";
    const title =
      el.getAttribute("data-orion-title") || el.querySelector("h2, h3")?.textContent || "";
    if (!id && !title) return null;
    return {
      id: "d-" + (id || title),
      platform: el.getAttribute("data-orion-platform") || "web",
      author: el.getAttribute("data-orion-author") || "unknown",
      handle: el.getAttribute("data-orion-handle") || "",
      title,
      body: el.innerText || "",
      tags: (el.getAttribute("data-orion-tags") || "").split(",").filter(Boolean),
      type: "post",
    };
  }

  function dedupe(records) {
    const seen = new Map();
    for (const r of records) if (!seen.has(r.post.id)) seen.set(r.post.id, r);
    return [...seen.values()];
  }

  // ============================================================
  //  APPLY RESULTS TO DOM
  // ============================================================

  const badges = new Map();
  const counts = { removed: 0, dimmed: 0, visible: 0 };

  function clearConceal(el) {
    el.classList.remove("orion-remove", "orion-dim", "orion-hidden");
    if (el.hasAttribute("hidden")) el.removeAttribute("hidden");
  }

  function applyResult(el, result, showScores) {
    clearConceal(el);

    if (!settings.enabled) {
      removeBadge(el);
      return;
    }

    if (!result.visible) {
      if (settings.mode === "dim") {
        el.classList.add("orion-dim");
        counts.dimmed++;
      } else {
        el.classList.add("orion-remove");
        counts.removed++;
      }
    } else {
      counts.visible++;
    }

    if (showScores) {
      let badge = badges.get(el);
      if (!badge) {
        badge = document.createElement("div");
        badge.className = "orion-badge";
        if (getComputedStyle(el).position === "static") el.style.position = "relative";
        el.appendChild(badge);
        badges.set(el, badge);
      }
      const tone =
        result.score >= 75 ? "orion-good" : result.score >= 48 ? "orion-mid" : "orion-bad";
      badge.className = "orion-badge " + tone;
      badge.textContent = result.visible ? String(result.score) : "\u2298 " + result.score;
      badge.title = (result.reasons || []).join(" \u00b7 ");
    } else {
      removeBadge(el);
    }
  }

  function removeBadge(el) {
    const b = badges.get(el);
    if (b) {
      b.remove();
      badges.delete(el);
    }
  }

  // ============================================================
  //  MAIN PIPELINE — score everything, apply to DOM
  // ============================================================

  function process(records) {
    if (!records.length) return;
    counts.removed = counts.dimmed = counts.visible = 0;

    // Use cached results where available
    const fresh = [];
    for (const r of records) {
      const hit = cache.get(r.post.id);
      if (hit) {
        applyResult(r.el, hit, settings.showScores);
      } else {
        fresh.push(r);
      }
    }

    if (fresh.length) {
      const intent = parseIntent(settings.prompt, settings.goal);
      const blocklist = { handles: settings.blockedHandles, keywords: settings.blockedKeywords };
      const scored = scoreAndFilter(fresh.map((r) => r.post), intent, {}, blocklist);
      const byId = new Map(scored.map((s) => [s.id, s]));

      for (const r of fresh) {
        const res = byId.get(r.post.id);
        if (!res) continue;
        const slim = { score: res.score, visible: res.visible, reasons: res.reasons };
        cacheSet(r.post.id, slim);
        applyResult(r.el, slim, settings.showScores);
      }

      _log.d(
        "scored " + fresh.length + " posts:",
        fresh.map((r) => r.post.id + "=" + (byId.get(r.post.id)?.score ?? "?")).join(", ")
      );
    }

    document.documentElement.dataset.orionCounts = JSON.stringify(counts);
    document.dispatchEvent(new CustomEvent("orion:applied", { detail: { ...counts } }));
    _log.d("applied:", JSON.stringify(counts));
  }

  // ============================================================
  //  SCHEDULING + OBSERVER
  // ============================================================

  let timer = null;
  function schedule(delay) {
    delay = delay || 150;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const records = collectRecords();
      if (records.length) {
        _log.i("found " + records.length + " posts, scoring...");
        process(records);
      } else {
        _log.d("no posts found on this scan");
      }
    }, delay);
  }

  let observer = null;

  function hasPostCandidates(mutation) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (typeof node.matches === "function") {
        if (
          node.matches('article[data-testid="tweet"], [data-orion-post], [data-testid="tweetText"]')
        )
          return true;
      }
      if (node.querySelector)
        if (
          node.querySelector(
            'article[data-testid="tweet"], [data-orion-post], [data-testid="tweetText"]'
          )
        )
          return true;
    }
    return false;
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver((mutations) => {
      if (!mutations.some(hasPostCandidates)) return;
      schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    _log.i("observer started");
  }

  // ============================================================
  //  HEALTH / SELF-HEALING
  // ============================================================

  function healthCheck(observed, healthy) {
    const doc = document.documentElement;
    if (observed > 4 && healthy === 0) {
      if (doc.dataset.orionDegraded !== "1") {
        _log.w(
          "X markup changed? found " + observed + " posts but extracted none. Staying visible."
        );
      }
      doc.setAttribute("data-orion-degraded", "1");
    } else if (healthy > 0 && doc.dataset.orionDegraded) {
      doc.removeAttribute("data-orion-degraded");
    }
  }

  // ============================================================
  //  VISIBLE INDICATOR — tiny pill so user knows ORION is active
  // ============================================================

  function showIndicator() {
    const el = document.createElement("div");
    el.id = "orion-pill";
    el.textContent = "ORION";
    el.style.cssText =
      "position:fixed;bottom:12px;right:12px;z-index:99999;" +
      "background:#0b0d14;color:#2dd4a8;font:700 11px system-ui,sans-serif;" +
      "letter-spacing:0.1em;padding:5px 10px;border-radius:999px;" +
      "border:1px solid #2dd4a844;pointer-events:none;opacity:0.7;" +
      "transition:opacity 3s ease 4s;";
    document.documentElement.appendChild(el);
    // Fade out after 7 seconds
    setTimeout(() => { el.style.opacity = "0"; }, 100);
    setTimeout(() => { el.remove(); }, 8000);
  }

  // ============================================================
  //  STORAGE SYNC
  // ============================================================

  chrome.storage.local.get({ ...DEFAULT_SETTINGS }, (s) => {
    settings = { ...DEFAULT_SETTINGS, ...s };
    if (settings.mode === "collapse" || settings.mode === "blur") settings.mode = "remove";
    refreshLogger();
    _log.i("settings loaded, goal=" + settings.goal + " mode=" + settings.mode);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const relevant = Object.keys(changes).some((k) => k in DEFAULT_SETTINGS);
    if (!relevant) return;
    chrome.storage.local.get({ ...DEFAULT_SETTINGS }, (s) => {
      settings = { ...DEFAULT_SETTINGS, ...s };
      refreshLogger();
      cache.clear();
      hangupBadges();
      _log.i("settings changed, rescoring...");
      schedule(60);
    });
  });

  function hangupBadges() {
    badges.forEach((b) => b.remove());
    badges.clear();
  }

  // ============================================================
  //  MESSAGES FROM POPUP
  // ============================================================

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === "ORION_RESCORE") {
      cache.clear();
      schedule(30);
    }
    if (msg && msg.type === "ORION_STATUS") {
      sendResponse({
        enabled: settings.enabled,
        mode: settings.mode,
        counts: { ...counts },
        degraded: document.documentElement.dataset.orionDegraded === "1",
        site: document.documentElement.dataset.orionSite || "unknown",
      });
      return true;
    }
  });

  // ============================================================
  //  LIFECYCLE
  // ============================================================

  const cleanup = () => {
    clearTimeout(timer);
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  addEventListener("pagehide", cleanup);
  addEventListener("pageshow", () => {
    if (!observer) startObserver();
    schedule(200);
  });

  function init() {
    showIndicator();
    startObserver();
    schedule(500);
    document.dispatchEvent(new Event("orion:ready"));
    _log.i("v2.1.1 initialized on " + location.hostname);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();