# AI-Powered Personalized Content Curation

**Team Orion · Smart India Hackathon Prototype**

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

The scoring engine is transparent and deterministic, using:

* Goal overlap
* Interest overlap
* Exclusions
* Feedback weights

An LLM can be integrated later through `/api/intent` without changing the UI.
