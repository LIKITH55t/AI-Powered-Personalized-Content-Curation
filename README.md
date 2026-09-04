# ORION — Goal-Based Feed

Team Orion · Smart India Hackathon prototype. A goal-shaped social feed: natural-language intent in, off-topic content out.

## What it does

- **Goals:** Placements, Competitive Exams, Skill Learning
- **Intent parser:** extracts interests and exclusions from a prompt
- **Relevance scoring:** multi-signal match for every post
- **Filtering:** low-score items are suppressed
- **Personalization:** likes, saves, skips, and hides update tag weights
- **Extension:** CSS-hide layer for marked posts (non-intrusive)

## Run locally

**Terminal 1 — API**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 — UI**

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Chrome extension

1. `chrome://extensions` → Developer mode
2. Load unpacked → `extension/`
3. Keep the API running so scoring works

## Stack

Python · FastAPI · React · Vite · Tailwind · Chrome Extension (MV3)

Scoring is a transparent, deterministic engine (goal overlap + interest overlap + exclusions + feedback weights). Swap in an LLM at `/api/intent` later without changing the UI.
