from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

WEB_DIR = Path(__file__).resolve().parent.parent / "web"

from engine import (
    GOAL_PROFILES,
    analytics,
    apply_feedback,
    load_posts,
    load_store,
    parse_intent,
    rank_feed,
    save_store,
)
from llm import llm_enabled, parse_intent_smart

app = FastAPI(title="ORION Goal-Based Feed", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IntentBody(BaseModel):
    prompt: str = ""
    goal: str = "placements"
    useLlm: bool | None = None


class FeedbackBody(BaseModel):
    postId: str
    action: Literal["like", "save", "skip", "click", "hide"]


class ProfileBody(BaseModel):
    name: str | None = None
    goal: str | None = None
    prompt: str | None = None


class ScoreBody(BaseModel):
    posts: list[dict[str, Any]] = Field(default_factory=list)
    prompt: str = ""
    goal: str = "placements"


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "product": "ORION"}


@app.get("/api/goals")
def goals() -> dict[str, Any]:
    return {
        "goals": [
            {
                "id": key,
                "label": val["label"],
                "include": val["include"][:8],
                "exclude": val["exclude"],
            }
            for key, val in GOAL_PROFILES.items()
        ]
    }


@app.post("/api/intent")
def intent(body: IntentBody) -> dict[str, Any]:
    parsed = _resolve_intent(body.prompt, body.goal, forced=body.useLlm)
    store = load_store()
    store["profile"]["goal"] = parsed["goal"]
    store["profile"]["prompt"] = body.prompt
    store.setdefault("history", []).append({"prompt": body.prompt, "goal": parsed["goal"]})
    store["history"] = store["history"][-30:]
    save_store(store)
    return parsed


def _resolve_intent(prompt: str, goal: str, forced: bool | None = None) -> dict[str, Any]:
    """Use the LLM when enabled (unless the client forces it off) and return true intent."""
    if forced is False:
        return parse_intent(prompt, goal)
    if llm_enabled() or forced is True:
        return parse_intent_smart(prompt, goal)
    return parse_intent(prompt, goal)


@app.get("/api/profile")
def get_profile() -> dict[str, Any]:
    store = load_store()
    return store["profile"]


@app.post("/api/profile")
def set_profile(body: ProfileBody) -> dict[str, Any]:
    store = load_store()
    if body.name is not None:
        store["profile"]["name"] = body.name
    if body.goal is not None:
        store["profile"]["goal"] = body.goal
    if body.prompt is not None:
        store["profile"]["prompt"] = body.prompt
    save_store(store)
    return store["profile"]


@app.get("/api/feed")
def feed(goal: str | None = None, prompt: str | None = None) -> dict[str, Any]:
    store = load_store()
    profile = store["profile"]
    goal_key = goal or profile.get("goal") or "placements"
    user_prompt = prompt if prompt is not None else profile.get("prompt") or ""
    intent = _resolve_intent(user_prompt, goal_key)
    ranked = rank_feed(load_posts(), intent, store.get("weights") or {})
    return {
        "intent": intent,
        "items": ranked,
        "analytics": analytics(store, ranked),
    }


@app.post("/api/score")
def score(body: ScoreBody) -> dict[str, Any]:
    store = load_store()
    intent = parse_intent(body.prompt, body.goal)
    ranked = rank_feed(body.posts, intent, store.get("weights") or {})
    return {"intent": intent, "items": ranked}


@app.post("/api/feedback")
def feedback(body: FeedbackBody) -> dict[str, Any]:
    store = load_store()
    posts = {p["id"]: p for p in load_posts()}
    post = posts.get(body.postId)
    if not post:
        raise HTTPException(status_code=404, detail="Unknown post")
    apply_feedback(store, post, body.action)
    intent = _resolve_intent(store["profile"].get("prompt") or "", store["profile"].get("goal") or "placements")
    ranked = rank_feed(load_posts(), intent, store.get("weights") or {})
    return {"ok": True, "analytics": analytics(store, ranked), "items": ranked}


@app.get("/api/insights")
def insights() -> dict[str, Any]:
    store = load_store()
    intent = _resolve_intent(store["profile"].get("prompt") or "", store["profile"].get("goal") or "placements")
    ranked = rank_feed(load_posts(), intent, store.get("weights") or {})
    by_platform: dict[str, dict[str, int]] = {}
    for item in ranked:
        bucket = by_platform.setdefault(item["platform"], {"shown": 0, "hidden": 0})
        bucket["shown" if item["visible"] else "hidden"] += 1
    return {
        "intent": intent,
        "analytics": analytics(store, ranked),
        "platforms": by_platform,
        "history": store.get("history") or [],
    }
