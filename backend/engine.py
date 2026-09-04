"""Intent parsing, relevance scoring, and adaptive personalization."""

from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent / "data"
POSTS_PATH = DATA_DIR / "posts.json"
STORE_PATH = DATA_DIR / "store.json"

GOAL_PROFILES: dict[str, dict[str, Any]] = {
    "placements": {
        "label": "Placements",
        "include": [
            "dsa", "interview", "placement", "resume", "internship", "oa",
            "system design", "leetcode", "sde", "offer", "ats", "graphs",
            "dynamic programming", "dbms", "operating systems", "sql",
            "product company", "off campus", "mock interview",
        ],
        "exclude": ["meme", "gossip", "crypto", "shorts", "brainrot", "giveaway"],
    },
    "exams": {
        "label": "Competitive Exams",
        "include": [
            "upsc", "jee", "neet", "gate", "prelims", "mains", "pyq",
            "ncert", "polity", "current affairs", "physics", "chemistry",
            "biology", "ethics", "revision", "numerical", "laxmikanth",
        ],
        "exclude": ["meme", "gossip", "crypto", "viral", "entertainment"],
    },
    "skills": {
        "label": "Skill Learning",
        "include": [
            "python", "react", "javascript", "course", "tutorial", "machine learning",
            "gpt", "ui", "design", "vim", "web development", "programming",
            "skill", "learn", "from scratch",
        ],
        "exclude": ["meme", "gossip", "politics", "shorts", "brainrot"],
    },
}

STOPWORDS = {
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with",
    "my", "i", "me", "is", "it", "from", "that", "this", "but", "no", "not",
    "want", "need", "please", "just", "some", "any", "about", "into",
}

EXCLUDE_CUES = (
    "no ", "not ", "without ", "except ", "exclude ",
    "don't want ", "dont want ", "skip ", "hide ", "suppress ", "block ",
)


def load_posts() -> list[dict[str, Any]]:
    return json.loads(POSTS_PATH.read_text(encoding="utf-8"))


def load_store() -> dict[str, Any]:
    if STORE_PATH.exists():
        return json.loads(STORE_PATH.read_text(encoding="utf-8"))
    store = {
        "profile": {
            "name": "Aanya",
            "goal": "placements",
            "prompt": "I am targeting SDE internships. Show DSA, system design, and resume help. Hide memes, politics, and celebrity content.",
        },
        "weights": {},
        "feedback": [],
        "history": [],
    }
    save_store(store)
    return store


def save_store(store: dict[str, Any]) -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STORE_PATH.write_text(json.dumps(store, indent=2), encoding="utf-8")


def tokenize(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9+#]+", text.lower()) if t not in STOPWORDS and len(t) > 1]


def parse_intent(prompt: str, goal: str) -> dict[str, Any]:
    prompt = (prompt or "").strip()
    goal_key = goal if goal in GOAL_PROFILES else "placements"
    profile = GOAL_PROFILES[goal_key]

    include: list[str] = list(profile["include"][:6])
    exclude: list[str] = list(profile["exclude"])

    lowered = prompt.lower()
    for cue in EXCLUDE_CUES:
        if cue not in lowered:
            continue
        after = lowered.split(cue, 1)[1]
        chunk = re.split(r"[.!?\n]| but | and keep | and show ", after, maxsplit=1)[0]
        parts = re.split(r",|/| and | or ", chunk)
        for part in parts:
            phrase = part.strip(" .")
            if 2 <= len(phrase) <= 40:
                exclude.append(phrase)

    include_blob = prompt
    for cue in EXCLUDE_CUES:
        include_blob = re.split(cue, include_blob, maxsplit=1, flags=re.I)[0]

    phrases = [p.strip() for p in re.split(r",|\.| but | and ", include_blob) if p.strip()]
    for phrase in phrases:
        tokens = tokenize(phrase)
        if tokens:
            include.append(" ".join(tokens[:4]))

    # unique, keep order
    def uniq(items: list[str]) -> list[str]:
        seen: set[str] = set()
        out = []
        for item in items:
            key = item.lower().strip()
            if key and key not in seen:
                seen.add(key)
                out.append(item.strip())
        return out[:12]

    interests = uniq(include)
    exclusions = uniq(exclude)
    summary = (
        f"Optimize for {profile['label'].lower()}."
        + (f" Prioritize: {', '.join(interests[:4])}." if interests else "")
        + (f" Suppress: {', '.join(exclusions[:4])}." if exclusions else "")
    )
    return {
        "goal": goal_key,
        "goalLabel": profile["label"],
        "interests": interests,
        "exclusions": exclusions,
        "summary": summary,
        "prompt": prompt,
    }


def _count(haystack: str, phrases: list[str]) -> int:
    """Number of distinct phrases present in the haystack (as substrings)."""
    if not phrases:
        return 0
    return sum(1 for p in phrases if p.lower() in haystack)


def _overlap(haystack: str, phrases: list[str]) -> float:
    if not phrases:
        return 0.0
    hits = sum(1 for p in phrases if p.lower() in haystack)
    return hits / max(len(phrases), 1)


def score_post(post: dict[str, Any], intent: dict[str, Any], weights: dict[str, float]) -> dict[str, Any]:
    blob = " ".join(
        [
            post.get("title") or "",
            post.get("body") or "",
            " ".join(post.get("tags") or []),
            post.get("author") or "",
        ]
    ).lower()

    interests = intent.get("interests") or []
    exclusions = intent.get("exclusions") or []
    goal = intent.get("goal") or "placements"
    profile = GOAL_PROFILES.get(goal, GOAL_PROFILES["placements"])

    # Signal 1: how many goal vocabulary terms the post touches.
    goal_hits = _count(blob, profile["include"])
    # Signal 2: how many explicit user interests match.
    interest_hits = _count(blob, interests)
    # Signal 3: token-level overlap with the interest vocabulary.
    tokens = set(tokenize(blob))
    interest_tokens = set()
    for phrase in interests:
        interest_tokens.update(tokenize(phrase))
    token_hit = len(tokens & interest_tokens) / max(len(interest_tokens), 1)
    # Penalty: excluded themes present.
    exclude_hits = _count(blob, exclusions + profile["exclude"])

    personal = 0.0
    for tag in post.get("tags") or []:
        personal += weights.get(tag, 0.0)
    personal = max(-0.25, min(0.25, personal / 4))

    # Saturated signals: any goal hit is meaningful, more hits push higher.
    goal_sig = min(1.0, goal_hits / 3.0)
    inter_sig = min(1.0, interest_hits / 1.5)
    token_sig = min(1.0, token_hit)
    quality = 0.06 if post.get("type") in {"video", "article", "thread"} else 0.0

    relevance = (
        0.44 * goal_sig
        + 0.32 * inter_sig
        + 0.18 * token_sig
        + 0.06 * quality
        + personal
    )
    penalty = min(0.85, exclude_hits) * 0.5

    # The -0.26 baseline makes zero-signal (off-intent but not offensive) posts
    # land below the visibility threshold instead of clumping around 50.
    raw = relevance - penalty - 0.26
    score = int(max(0, min(100, round(50 + raw * 72))))

    if exclude_hits and score > 38:
        score = min(score, 34)

    reasons = []
    if goal_hits:
        reasons.append(f"Aligns with {profile['label']}")
    if interest_hits:
        reasons.append("Matches stated interests")
    if exclude_hits:
        reasons.append("Contains excluded themes")
    if personal > 0.04:
        reasons.append("Boosted by your saves/likes")
    if personal < -0.04:
        reasons.append("Downweighted from skips")
    if not reasons:
        reasons.append("Weak topical overlap")

    visible = score >= 48
    return {
        **post,
        "score": score,
        "visible": visible,
        "reasons": reasons[:3],
        "signals": {
            "goalFit": round(goal_sig, 3),
            "interestFit": round(inter_sig, 3),
            "excludeRisk": round(exclude_hits, 3),
            "personalization": round(personal, 3),
        },
    }


def rank_feed(posts: list[dict[str, Any]], intent: dict[str, Any], weights: dict[str, float]) -> list[dict[str, Any]]:
    scored = [score_post(p, intent, weights) for p in posts]
    scored.sort(key=lambda x: (-x["score"], x["id"]))
    return scored


def apply_feedback(store: dict[str, Any], post: dict[str, Any], action: str) -> dict[str, Any]:
    delta = {"like": 0.18, "save": 0.28, "click": 0.08, "skip": -0.22, "hide": -0.3}.get(action, 0.0)
    weights: dict[str, float] = store.setdefault("weights", {})
    for tag in post.get("tags") or []:
        weights[tag] = round(max(-1.0, min(1.5, weights.get(tag, 0.0) + delta)), 3)
    store.setdefault("feedback", []).append(
        {"postId": post.get("id"), "action": action, "tags": post.get("tags") or []}
    )
    store["feedback"] = store["feedback"][-200:]
    save_store(store)
    return weights


def analytics(store: dict[str, Any], feed: list[dict[str, Any]]) -> dict[str, Any]:
    shown = [p for p in feed if p["visible"]]
    hidden = [p for p in feed if not p["visible"]]
    fb = store.get("feedback") or []
    counts = {k: 0 for k in ("like", "save", "skip", "click", "hide")}
    for item in fb:
        if item.get("action") in counts:
            counts[item["action"]] += 1
    avg = int(sum(p["score"] for p in shown) / max(len(shown), 1)) if shown else 0
    return {
        "shown": len(shown),
        "hidden": len(hidden),
        "avgScore": avg,
        "suppressionRate": round(len(hidden) / max(len(feed), 1), 3),
        "feedback": counts,
        "topWeights": sorted(
            [{"tag": k, "weight": v} for k, v in (store.get("weights") or {}).items()],
            key=lambda x: -abs(x["weight"]),
        )[:8],
        "batchSize": 10,
    }


def percentile(values: list[int], p: float) -> int:
    if not values:
        return 0
    values = sorted(values)
    idx = min(len(values) - 1, max(0, math.ceil(p * len(values)) - 1))
    return values[idx]
