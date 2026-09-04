# AI-Powered Personalized Content Curation

A goal-shaped social feed that uses natural-language intent to personalize content and filter out off-topic posts.

## What it does

* **Goals:** Placements, Competitive Exams, Skill Learning
* **Intent Parser:** Extracts interests and exclusions from a prompt
* **Relevance Scoring:** Multi-signal matching for every post
* **Filtering:** Low-score items are suppressed
* **Personalization:** Likes, saves, skips, and hides update tag weights
* **Chrome Extension:** CSS-hide layer for marked posts

## Run Locally

### Terminal 1 — API

```bash
cd backend
python -m venv .venv
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

## Chrome Extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Keep the API running so scoring works

## Tech Stack

Python · FastAPI · React · Vite · Tailwind CSS · Chrome Extension (MV3)

## Scoring

The scoring engine is transparent and deterministic. Post scores are built from saturating
count-based signals (not diluted hit-fractions), so they spread across the range instead of
clumping around a baseline:

* **Goal fit** — how many terms of the active goal's vocabulary the post touches
* **Interest fit** — how many explicitly-stated interests match
* **Token overlap** — token-level intersection with the interest vocabulary
* **Exclusions** — strong negative penalty for excluded themes
* **Feedback weights** — likes/saves boost, skips/hides suppress

Posts with zero signal land below the visibility threshold rather than sitting at ~50, so
off-intent content is actually suppressed.

An LLM can be integrated behind `/api/intent` without changing the UI. Enable it with any
OpenAI-compatible endpoint:

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
