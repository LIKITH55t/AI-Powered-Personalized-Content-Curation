# ORION — Technical Documentation

**AI-Powered Personalized Content Curation**

A goal-shaped content system that turns a natural-language intent into curated, on-topic feeds across the web — and filters your X (Twitter) feed in real time from inside your browser.

---

## 1. Project Overview

ORION ("Optimized Relevant Intent-Oriented Notifications") solves one problem: **social feeds are chronological noise, not anything close to what you need.** It lets you describe *what belongs* and *what doesn't* in plain language, then uses a transparent, deterministic scoring model to rank every post and remove (or dim) the off-topic ones.

The project ships in **three layers**:

| Layer | What it does | Where it lives |
|---|---|---|
| **Chrome Extension (MV3)** | Scores and filters your real X/Twitter feed live in the browser. Fully offline — no backend required. | `extension/` |
| **Backend API (FastAPI)** | Serves the demo feed, intent parsing (local + optional LLM), personalization, and analytics. | `backend/` |
| **Web Frontend (React)** | The showcase UI: onboarding, curated feed, goals, insights, platform explorer. | `frontend/` |

A lightweight standalone demo (`web/`) is also served statically by the backend.

---

## 2. Tech Stack

### Backend API — `backend/`

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.14 | Runtime |
| FastAPI | ≥ 0.115.6 | REST API framework |
| Uvicorn | ≥ 0.34.0 | ASGI server |
| Pydantic | ≥ 2.11 | Request/response models & validation |
| python-dotenv | ≥ 1.0.1 | Env configuration |
| stdlib `urllib` | — | Optional LLM HTTP calls (zero extra deps) |
| pytest + httpx | dev | 26 unit tests |

### Frontend — `frontend/`

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| Vite | 6.0.3 | Dev server & build |
| React Router | 7.18.3 | Page routing |
| Tailwind CSS | 3.4.16 | Styling |
| Framer Motion | 11.15.0 | Animations |
| lucide-react | 0.468.0 | Icons |

### Extension — `extension/`

| Technology | Version | Purpose |
|---|---|---|
| Chrome Manifest V3 | 3 | Extension platform |
| Vanilla JS (classic content scripts) | ES2020+ | Zero-bundle, no build step |
| Vitest | 3.x | Unit tests |
| jsdom | 26.x | DOM test environment |

> **Design principle:** the extension is deliberately dependency-free — no bundler, no runtime, no Node modules shipped. Test tooling is dev-only.

---

## 3. Architecture

### 3.1 System Overview

```
                         ┌────────────────────────────┐
                         │       CHROME EXTENSION     │
                         │      (fully offline)       │
                         └─────────────┬──────────────┘
                                       │ mutation observer
                                       ▼
   X / Twitter DOM  ──▶  x-adapter.js  ──▶  content.js (discovery + apply)
      (tweets,                            │
       quotes,                            │ inline scoring engine
       notifications)                     │ (parseIntent → scorePost)
                                       ┌──▼──────────────┐
   The web ───────────────────────────▶│  CACHE (Map)    │
                                       └─────────────────┘
                                       │ remove / dim CSS
                                       ▼
                       Live filtered X feed (hide.css)

                         ┌────────────────────────────┐
                         │         BACKEND API        │
                         │        FastAPI :8000       │
                         └─────────────┬──────────────┘
        /api/feed  /api/intent  /api/feedback  /api/analytics...
                                       │
                         engine.py ──▶ parse_intent → score_post → rank_feed
                                       │         ▲
                                       │         │ weights (personalization)
                            data/posts.json      └── data/store.json
                                       │
                         ┌─────────────▼──────────────┐
                         │      REACT FRONTEND        │
                         │    Vite :5173              │
                         │  Onboarding · Feed · Goals │
                         │  Insights · Platforms      │
                         └────────────────────────────┘
```

### 3.2 Extension Architecture (MV3 content script)

The extension uses **two classic content scripts** injected in order:

```
manifest.json
 ├─ content_scripts[0]  → demo fallback (localhost:5173, file://)  [content.js + hide.css]
 └─ content_scripts[1]  → X/Twitter                                 [x-adapter.js + content.js + hide.css]
```

```
x-adapter.js                     content.js
─────────────                    ─────────
registers globalThis.__orionAdapters
 ├─ x-feed          ────────▶   DISCOVERY: collectRecords()
 │  article[data-testid="tweet"]      │
 │  skips nested quotes               │
 │  statusIdFromArticle               │
 │  extractTweet (author/handle)      │
 │  recycle guard (data-orion-seen)   │
 └─ x-notifications                   │
     cellInnerDiv rows                ▼
                              SCORING (inlined, synchronous)
                              parseIntent → scoreAndFilter
                                       │  per-ID cache (Map, cap 4000)
                                       ▼
                              APPLY: .orion-remove / .orion-dim / badge
                                       │
                              MutationObserver + debounced schedule (150ms)
                                       │
                              healthCheck → html[data-orion-degraded]
```

### 3.3 Backend Architecture

```
                 ┌──────────────── FastAPI ────────────────┐
   HTTP clients ─┤  main.py                                │
   (React SPA,   │   CORS open · Pydantic bodies           │
    curl, tests) │                                         │
                 │   /api/health   /api/goals              │
                 │   /api/intent   /api/profile            │
                 │   /api/feed     /api/score              │
                 │   /api/feedback /api/insights           │
                 │   /api/history  / static web/           │
                 └───────────────┬─────────────────────────┘
                                 │
              ┌──────────────────┼───────────────────┐
              ▼                  ▼                   ▼
        engine.py            llm.py            data/
   parse_intent         ai_parse_intent      posts.json (corpus)
   score_post           (OpenAI-compatible   store.json (profile,
   rank_feed             /chat/completions)   weights, feedback,
   apply_feedback                             history)
   analytics
   quick_stats
```

---

## 4. Models

### 4.1 Intent Parsing Model (deterministic)

Turns `(prompt, goal)` into structured intent. Mirrored 1:1 in Python (`engine.py`) and JS (`rules.js`).

**Goal profiles** — three pre-built topical vocabularies:

| Goal | Include vocabulary (sample) | Exclude vocabulary |
|---|---|---|
| `placements` | dsa, interview, placement, resume, internship, oa, system design, leetcode, sde, offer... | meme, gossip, crypto, shorts, brainrot, giveaway |
| `exams` | upsc, jee, neet, gate, prelims, mains, pyq, ncert, polity, current affairs... | meme, gossip, crypto, viral, entertainment |
| `skills` | python, react, javascript, course, tutorial, machine learning, web development... | meme, gossip, politics, shorts, brainrot |

**Pipe:**

```
prompt ──▶ lowercase ──▶ exclude-cue scan ──▶ include-blob split
                │                │                    │
                │   ["no ", "not ", "without ",       │ phrases split on
                │    "skip ", "hide ", "block "...]    │ , . but and
                ▼                ▼                    ▼
           exclusions      interests (goal incl.      interests +=
           clustered        → uniq(12)                phrase tokens (≤4)
```

Output shape:
```json
{
  "goal": "placements",
  "goalLabel": "Placements",
  "interests": ["dsa", "interview", "system design"],
  "exclusions": ["meme", "politics"],
  "summary": "Optimize for placements. Prioritize: ... Suppress: ...",
  "prompt": "I am targeting SDE internships...",
  "source": "local"
}
```

### 4.2 Relevance Scoring Model (the core formula)

`scoring-engine.js` / `engine.py::score_post()` — **transparent, deterministic, count-based and saturated.**

Every post becomes a text blob:
```
blob = title + body + tags + author  (lowercased)
```

**Signals:**

| Signal | Formula (saturated) | Weight |
|---|---|---|
| Goal fit | `goalSig = min(1, goalHits / 3)` | **0.44** |
| Interest fit | `interSig = min(1, interestHits / 1.5)` | **0.32** |
| Token overlap | `tokenSig = min(1, tokenHit)` | **0.18** |
| Content quality | `quality = 0.06` if type ∈ {video, article, thread} | **0.06** |
| Personalization | `personal = clamp(Σ tag weights / 4, −0.25, +0.25)` | additive |

**Penalty & baseline:**

```
relevance = 0.44·goalSig + 0.32·interSig + 0.18·tokenSig + 0.06·quality + personal
penalty   = min(0.85, excludeHits) × 0.5
raw       = relevance − penalty − 0.26          ← baseline offset
score     = clamp(0…100, round(50 + raw × 72))
```

The **−0.26 baseline** is deliberate: a zero-signal, off-intent-but-not-offensive post lands *below* the visibility threshold instead of clumping at ~50.

**Hard rules:**

```
if excludeHits and score > 38  →  score = min(score, 34)   // excluded themes
visible = score >= 48                                       // visibility threshold
blocklisted → score = min(score, 12), visible = false       // blocklist wins
```

### 4.3 Blocklist Model

Two explicit, user-authored lists applied *after* scoring:

- **Handles** (`@alice`, one per line) — matched against `post.handle` (normalized, `@` stripped) *or* any substring of `post.author`. First match wins, reason = `Blocked account: @alice`.
- **Keywords / spoilers** (comma or line separated) — case-insensitive substring match against `title + body`. Reason = `Blocked keyword: <kw>`.

Blocked posts are **capped at score 12** regardless of their relevance — the score survives for transparency, the post does not.

### 4.4 Personalization Model (implicit feedback)

Every user action on a post adjusts **tag weights** stored in `store.json`:

| Action | Delta per tag | Learning signal |
|---|---|---|
| `like` | +0.18 | positive |
| `save` | +0.28 | strongly positive |
| `click` | +0.08 | weak positive |
| `skip` | −0.22 | negative |
| `hide` | −0.30 | strongly negative |

Weights are clamped to **[−1.0, 1.5]**, then folded into `personal` (see 4.2). The feedback log is capped at the 200 most recent events, and the top-8 weight deltas feed the analytics panel.

> Note: the extension itself does not collect aggregate feedback — personalization weights live server-side for the demo feed. The extension focuses on intent + blocklists in the browser.

### 4.5 Optional LLM Intent Model

`llm.py` swaps the deterministic parser for an OpenAI-compatible `/chat/completions` call when **any** of these env vars are set:

```
ORION_LLM_API_KEY     OpenAI / OpenRouter / Groq key
ORION_LLM_BASE_URL    default https://api.openai.com/v1
ORION_LLM_MODEL       default gpt-4o-mini
ORION_LLM_TIMEOUT     default 20s
```

The model is asked (system prompt, `temperature=0`, `response_format=json_object`) to return exactly:

```json
{"interests": ["..."], "exclusions": ["..."]}
```

**Degradation guarantee:** any config / network / schema error falls back to the deterministic parser with `source: "local"` and `llmError: "<Type>: <msg>"`. The feed never breaks because the LLM is unavailable. `llm.py` adds **no pip dependencies** (pure stdlib `urllib`).

---

## 5. End-to-End Working

### 5.1 The Extension on X (Twitter) — live filtering loop

```
1. LOAD        content_scripts run at document_idle on x.com
               x-adapter.js registers collectors on globalThis.__orionAdapters
               content.js reads settings from chrome.storage.local
               → console: "[ORION] v2.1.1 initialized on x.com"
               → a transient "ORION" pill confirms it is active

2. DISCOVER    collectRecords() asks every active adapter to scan <main>
                 x-feed:        article[data-testid="tweet"] top-level only
                                (nested quote embeds skipped via isNestedQuote)
                 x-notifications: [data-testid="cellInnerDiv"] tweet-previews
               Recycle-safe: each node records data-orion-seen = <statusId>,
               so recycled DOM nodes (same element, new tweet) are re-scored,
               while unchanged tweets are never re-extracted.

3. SCORE       For uncached posts:
                 intent = parseIntent(settings.prompt, settings.goal)
                 scoreAndFilter(posts, intent, {}, blocklist)
               Results cached per tweet-ID in a Map (cap 4000) — scrolling
               is cheap because already-seen tweets never re-run scoring.

4. APPLY       → score >= 48        → visible, untouched
               → score < 48         → .orion-remove (display:none)  [remove mode]
                                     or .orion-dim (faded, 22% opacity) [dim mode]
               → blocklisted        → forced hide, cap score 12
               → showScores on      → badge overlay with number + reasons

5. OBSERVE     A single debounced (150 ms) MutationObserver watches for new
               tweet/article nodes and re-runs steps 2–4 as you scroll.

6. SAFETY      healthCheck(): if >4 posts are observed but 0 extracted,
               html[data-orion-degraded="1"] is set and all conceal CSS is
               disabled — ORION never mass-hides content on a selector break.
```

**Popup ↔ content-script messaging:**

| Message | Direction | Purpose |
|---|---|---|
| `ORION_STATUS` | popup → content | returns enabled/mode/counts/degraded for the popup badge |
| `ORION_RESCORE` | popup/options → content | clears cache, re-runs a scan after settings change |
| `storage.onChanged` | storage → content | any settings key change triggers re-read + rescore |

### 5.2 The Demo Feed Flow (full-stack)

```
React Feed page
  │  GET /api/feed?goal=...&prompt=...
  ▼
FastAPI → _resolve_intent(prompt, goal)
           ├─ LLM configured?  → parse_intent_smart (LLM, fallback local)
           └─ otherwise        → parse_intent (deterministic)
  ▼
rank_feed(load_posts(), intent, weights)
  ├─ score_post() per corpus item (see §4.2)
  └─ sort by (-score, id)
  ▼
{ intent, items: [scored...], analytics }
  ▼
React renders visible posts; suppressed posts hidden behind
  "Reveal suppressed" toggle; batch pagination (10/batch)
  ▼
User acts: like / save / skip / hide / click
  ▼
POST /api/feedback { postId, action }
  → apply_feedback adjusts tag weights
  → re-ranked feed + analytics returned instantly
```

### 5.3 The Endpoints

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/api/health` | — | `{status, product}` |
| GET | `/api/goals` | — | goal profiles (label, include, exclude) |
| POST | `/api/intent` | `{prompt, goal, useLlm?}` | parsed intent + stores profile/history |
| GET | `/api/profile` | — | stored profile |
| POST | `/api/profile` | `{name?, goal?, prompt?}` | updated profile |
| GET | `/api/feed` | `goal?, prompt?` | `{intent, items, analytics}` |
| POST | `/api/score` | `{posts, prompt, goal}` | `{intent, items}` (score arbitrary posts) |
| POST | `/api/feedback` | `{postId, action}` | `{ok, analytics, items}` re-ranked |
| GET | `/api/insights` | — | intent + analytics + platform split + history |
| GET | `/api/history` | — | intent history with live per-entry stats |

### 5.4 The Analytics Model

| Metric | Definition |
|---|---|
| `shown` / `hidden` | visible vs suppressed posts in the ranked feed |
| `avgScore` | mean score of shown items |
| `suppressionRate` | `hidden / total` |
| `feedback` | count per action (like/save/skip/click/hide) |
| `topWeights` | top-8 tag weights by |weight| (the "what you care about" radar) |
| `batchSize` | pagination size (10) |

---

## 6. Important Data Flow Details

### 6.1 X DOM Extraction — the tricky parts

- **Status ID:** `statusIdFromArticle()` filters `a[href*="/status/"]` links by `a.closest('article[data-testid="tweet"]') === article`. This ignores status links living inside *quoted embeds*, so each article resolves to its **own** tweet ID.
- **Nested quotes:** `isNestedQuote(article)` checks `article.parentElement.closest('article[data-testid="tweet"]')`. A quote-embed article's parent is the outer tweet, so it's skipped — only the outer tweet is collected.
- **Recycling:** X recycles DOM nodes as you scroll. Tracking by ID (`data-orion-seen`) instead of a boolean flag means a recycled node containing a *different* tweet is correctly re-scored.

### 6.2 Scoring Parity

The Python engine and the JS engine are kept in lockstep and **verified by tests**:
- `backend/test_engine.py` — 26 tests
- `extension/test/scoring-engine.test.js` — 13 tests (incl. "parity with Python engine")
- `extension/test/x-adapter.test.js` — 10 tests (DOM extraction, quotes, recycling, notifications)

Run them:

```bash
cd backend
py -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
pytest test_engine.py -q
```

```bash
cd extension
npm install
npm test            # 23 tests, vitest + jsdom
```

---

## 7. Directory Map

```
SIH/
├── README.md                     # quick start
├── CHANGELOG.md                  # v1 → v2.1.1 history
├── DOCUMENTATION.md              # this file
├── backend/
│   ├── main.py                   # FastAPI app + all routes
│   ├── engine.py                 # intent, scoring, ranking, feedback, analytics
│   ├── llm.py                    # optional OpenAI-compatible intent parser
│   ├── requirements.txt / -dev   # deps
│   ├── test_engine.py            # 26 tests
│   └── data/
│       ├── posts.json            # demo corpus (multi-platform)
│       └── store.json            # profile, weights, feedback, history
├── frontend/
│   ├── vite.config.js            # proxy → :8000
│   ├── src/
│   │   ├── App.jsx               # router
│   │   ├── lib/api.js            # tiny fetch wrapper
│   │   ├── components/           # PostCard, HistoryPanel, Brand
│   │   └── pages/                # Landing, Onboarding, Feed, Goals,
│   │                             # Insights, Platforms, AppShell
├── extension/
│   ├── manifest.json             # MV3, two content scripts
│   ├── content.js                # self-contained: discovery + inline scoring + apply
│   ├── x-adapter.js              # X DOM collectors (feed + notifications)
│   ├── rules.js                  # goal profiles + intent parser (pure module, tests)
│   ├── scoring-engine.js          # scorePost / blocklists (pure module, tests)
│   ├── hide.css                  # .orion-remove / .orion-dim / badges / degraded
│   ├── popup.html + popup.js     # toggle, live stats, quick edit
│   ├── options.html + options.js # goals, prompt, blocklists, mode, debug
│   ├── vitest.config.js
│   └── test/                     # 23 tests
└── web/                          # static demo served by FastAPI
    └── assets/app.js
```

---

## 8. Configuration Quick Reference

### Backend env (optional LLM)

```
ORION_LLM_API_KEY=sk-...            # enables LLM parsing
ORION_LLM_BASE_URL=https://api.openai.com/v1
ORION_LLM_MODEL=gpt-4o-mini
ORION_LLM_TIMEOUT=20
```

### Extension settings (`chrome.storage.local`)

| Key | Type | Default |
|---|---|---|
| `enabled` | bool | `true` |
| `goal` | `placements` \| `exams` \| `skills` | `placements` |
| `prompt` | string | SDE-internship sample |
| `mode` | `remove` \| `dim` | `remove` |
| `blockedHandles` | string[] | `[]` |
| `blockedKeywords` | string[] | `[]` |
| `showScores` | bool | `false` |
| `debug` | bool | `false` |

---

## 9. Reliability & Safeguards

1. **Browser-first.** All extension scoring is inline and synchronous — no workers, no CDN, no backend. Nothing to break at runtime.
2. **Degraded mode.** If X changes its markup, `html[data-orion-degraded="1"]` keeps *every* post visible. ORION stops rather than mass-hides.
3. **LLM fallback.** The LLM is a progressive enhancement. Any failure silently returns the deterministic parser's output.
4. **Cache caps.** Tweet cache holds at most 4,000 IDs; feedback history holds 200 events; intent history holds 30 entries.
5. **Tests everywhere.** 49 tests (26 Python + 23 JS) lock down parity, DOM extraction, recycling, and blocklist behavior.