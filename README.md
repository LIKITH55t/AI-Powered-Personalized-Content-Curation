# AI-Powered Personalized Content Curation (ORION)

A goal-shaped social feed that uses natural-language intent to personalize content and filter out off-topic posts.

## What it does

* **Goals:** Placements, Competitive Exams, Skill Learning
* **Intent Parser:** Extracts interests and exclusions from a prompt
* **Relevance Scoring:** Multi-signal count-based matching for every post
* **Filtering:** Low-score items are removed from the feed or dimmed
* **Blocklists:** Explicit per-account and per-keyword blocklists via options page
* **Personalization:** Likes, saves, skips, and hides update tag weights
* **Chrome Extension:** All scoring runs locally in a Web Worker — no backend required

## Run Locally

### Terminal 1 — API (optional, for demo feed + LLM intent)

```bash
cd backend
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Terminal 2 — UI

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Chrome Extension (v2)

All scoring runs locally — the API is optional.

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Browse to X (Twitter) — posts are scored and filtered in real-time

### Options page

Click the ORION icon → **Settings & blocklists** (or right-click the extension → Options).

* Pick a goal (Placements / Exams / Skills)
* Write your intent prompt
* Add blocked accounts (one @handle per line)
* Add blocked keywords / spoiler phrases (comma or line separated)
* Toggle Remove (default) or Dim mode
* Toggle score badges and debug logging

### Popup

* Enabled / Paused toggle
* Live score counts (kept / removed / dimmed)
* Quick goal + prompt + mode editing
* Re-apply on the active tab instantly

## Architecture

| Layer | File | Role |
|---|---|---|
| Rules | `extension/rules.js` | Goal profiles, stopwords, intent parser (JS port of `engine.py`) |
| Scoring | `extension/scoring-engine.js` | `scorePost`, `rankPosts`, `applyBlocklists` — pure functions, no DOM |
| Worker | `extension/scoring-worker.js` | Module Web Worker entry; receives posts, returns scored results |
| Adapter | `extension/x-adapter.js` | DOM extraction for X: tweets, quote embeds, notifications |
| Content | `extension/content.js` | Discovery → worker → apply `remove` / `dim` classes; cache, health monitor |
| Styles | `extension/hide.css` | `.orion-remove` (display:none), `.orion-dim` (faded), badges, degraded fallback |
| Options | `extension/options.html` + `.js` | Full settings page with blocklists, mode, debug |
| Popup | `extension/popup.html` + `.js` | Quick toggle + status overlay |

## Scoring

The scoring engine is transparent and deterministic. Post scores are built from saturating
count-based signals (not diluted hit-fractions), so they spread across the range instead of
clumping around a baseline:

* **Goal fit** — how many terms of the active goal's vocabulary the post touches (saturated at 3 matches)
* **Interest fit** — how many explicitly-stated interests match (saturated at 1.5)
* **Token overlap** — token-level intersection with the interest vocabulary
* **Exclusions** — strong negative penalty for excluded themes
* **Feedback weights** — likes/saves boost, skips/hides suppress
* **Blocklists** — explicit account handles and keywords force removal regardless of score

Posts with zero signal land below the visibility threshold (48) rather than sitting at ~50, so
off-intent content is actually suppressed. Blocklisted posts are capped at score 12.

### Tests

```bash
cd extension
npm install
npm test
```

23 tests covering intent parsing, scoring parity with the Python engine, blocklist enforcement, DOM extraction, nested-quote skipping, recycle safety, and notification collection.

### Self-healing

If X changes its markup and extraction fails, the extension sets `data-orion-degraded` on
`<html>` and keeps all posts visible — it never mass-hides content due to a selector break.

## LLM Intent (optional)

The backend `/api/intent` endpoint can use an OpenAI-compatible LLM to parse intent. Enable with:

```bash
# OpenAI
set ORION_LLM_API_KEY=sk-...        # PowerShell
# or set the base URL + model for OpenRouter / Groq / local Ollama
set ORION_LLM_BASE_URL=https://api.openai.com/v1
set ORION_LLM_MODEL=gpt-4o-mini
```

When enabled, `/api/intent` (and `/api/feed`) parse intent with the LLM and fall back to the
deterministic engine on any error, so the feed never breaks. `llm.py` adds no pip dependencies.

> Python 3.14: `pydantic>=2.11` is required (2.10.x has no prebuilt wheel and builds pydantic-core from source, which needs the MSVC linker).

## Tech Stack

Python · FastAPI · React · Vite · Tailwind CSS · Chrome Extension (MV3) · Vitest · jsdom