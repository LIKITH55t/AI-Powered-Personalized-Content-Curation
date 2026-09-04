"""Unit tests for the ORION scoring engine and intent parser."""

from __future__ import annotations

import pytest

import engine


@pytest.fixture
def posts():
    return engine.load_posts()


# ---------------------------------------------------------------- intent parser


def test_parse_intent_default_goal_profile():
    s = engine.parse_intent("", "placements")
    assert s["goal"] == "placements"
    assert s["goalLabel"] == "Placements"
    assert "dsa" in s["interests"]
    assert "meme" in s["exclusions"]


def test_parse_intent_ignores_bad_goal():
    s = engine.parse_intent("", "nonexistent-goal")
    assert s["goal"] == "placements"  # falls back to placements


def test_parse_intent_extracts_named_interests():
    s = engine.parse_intent("Show DSA, system design, and resume help.", "placements")
    joined = " ".join(s["interests"])
    assert "dsa" in joined
    assert "system design" in joined
    assert "resume" in joined


def test_parse_intent_extracts_exclusions_from_prompt():
    s = engine.parse_intent("Show DSA. Hide memes and cricket.", "placements")
    ex = " ".join(s["exclusions"])
    assert "meme" in ex
    assert "cricket" in ex


def test_parse_intent_respects_goal_labels():
    s = engine.parse_intent("gate preps", "exams")
    assert s["goal"] == "exams"
    assert s["goalLabel"] == "Competitive Exams"
    assert "gate" in " ".join(s["interests"])


# ---------------------------------------------------------------- scoring


def test_score_post_high_on_relevant():
    post = {
        "id": "t1",
        "platform": "youtube",
        "title": "DSA interview prep playlist",
        "body": "Dynamic programming and system design for SDE interviews.",
        "tags": ["dsa", "placements", "interviews"],
        "author": "x",
        "type": "video",
    }
    intent = engine.parse_intent("Show DSA and system design", "placements")
    scored = engine.score_post(post, intent, {})
    assert scored["visible"] is True
    assert scored["score"] >= 60


def test_score_post_hidden_on_excluded():
    post = {
        "id": "t2",
        "platform": "x",
        "title": "meme",
        "body": "A meme about celebrity gossip and viral shorts.",
        "tags": ["meme", "gossip"],
        "author": "x",
        "type": "post",
    }
    intent = engine.parse_intent("Show DSA", "placements")
    scored = engine.score_post(post, intent, {})
    assert scored["visible"] is False
    assert scored["score"] < 48


def test_score_post_personal_weight_boost():
    base = {
        "id": "t3",
        "platform": "x",
        "title": "SQL window functions explained",
        "body": "A tutorial covering window functions and query optimization.",
        "tags": ["sql"],
        "author": "x",
        "type": "post",
    }
    intent = engine.parse_intent("Show SQL", "placements")
    no_w = engine.score_post(base, intent, {})
    boosted = engine.score_post(base, intent, {"sql": 1.0})
    assert boosted["score"] > no_w["score"]
    assert "Boosted by your saves/likes" in boosted["reasons"]


def test_rank_feed_sorted_descending(posts):
    intent = engine.parse_intent("Show DSA and system design. Hide memes.", "placements")
    ranked = engine.rank_feed(posts, intent, {})
    scores = [p["score"] for p in ranked]
    assert scores == sorted(scores, reverse=True)


def test_rank_feed_visible_and_hidden_counts(posts):
    intent = engine.parse_intent("", "placements")
    ranked = engine.rank_feed(posts, intent, {})
    assert len(ranked) == len(posts)
    assert any(p["visible"] for p in ranked)
    assert any(not p["visible"] for p in ranked)


def test_score_always_in_0_100(posts):
    intent = engine.parse_intent("", "skills")
    for p in engine.rank_feed(posts, intent, {}):
        assert 0 <= p["score"] <= 100


# ---------------------------------------------------------------- feedback


def test_apply_feedback_updates_weights(posts):
    store = {
        "profile": {"goal": "placements", "prompt": ""},
        "weights": {},
        "feedback": [],
        "history": [],
    }
    post = next(p for p in posts if p.get("tags"))
    engine.apply_feedback(store, post, "like")
    for tag in post["tags"]:
        assert store["weights"].get(tag, 0.0) > 0.0
    assert store["feedback"][-1]["action"] == "like"


def test_apply_feedback_negative_for_skip(posts):
    store = {"profile": {}, "weights": {}, "feedback": [], "history": []}
    post = next(p for p in posts if p.get("tags"))
    tag = post["tags"][0]
    engine.apply_feedback(store, post, "hide")
    assert store["weights"][tag] < 0.0


# ---------------------------------------------------------------- analytics


def test_analytics_shape(posts):
    intent = engine.parse_intent("", "placements")
    ranked = engine.rank_feed(posts, intent, {})
    store = {"weights": {}, "feedback": []}
    a = engine.analytics(store, ranked)
    assert a["shown"] + a["hidden"] == len(posts)
    assert 0.0 <= a["suppressionRate"] <= 1.0
    assert set(a["feedback"]) == {"like", "save", "skip", "click", "hide"}


def test_analytics_counts_feedback(posts):
    intent = engine.parse_intent("", "placements")
    ranked = engine.rank_feed(posts, intent, {})
    store = {"weights": {}, "feedback": [{"action": "like"}, {"action": "like"}, {"action": "hide"}]}
    a = engine.analytics(store, ranked)
    assert a["feedback"]["like"] == 2
    assert a["feedback"]["hide"] == 1


# ---------------------------------------------------------------- LLM fallback


def test_llm_fallback_to_local_when_enabled_but_unreachable(monkeypatch):
    import importlib
    import sys

    import llm

    monkeypatch.setenv("ORION_LLM_BASE_URL", "http://127.0.0.1:1/v1")
    monkeypatch.setenv("ORION_LLM_API_KEY", "sk-test")
    monkeypatch.setenv("ORION_LLM_TIMEOUT", "2")
    # Force the module constants to recompute from the new environment.
    for name in list(sys.modules):
        if name == "llm" or name.startswith("llm."):
            del sys.modules[name]
    llm = importlib.import_module("llm")

    assert llm.llm_enabled() is True
    result = llm.parse_intent_smart("Show DSA", "placements")
    assert result["source"] == "local"
    assert "llmError" in result
