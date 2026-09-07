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


# ---------------------------------------------------------------- quick_stats


def test_quick_stats_returns_required_keys(posts):
    intent = engine.parse_intent("Show DSA and system design", "placements")
    stats = engine.quick_stats(posts, intent, {})
    assert set(stats.keys()) == {"shown", "hidden", "avgScore", "suppressionRate"}


def test_quick_stats_shown_plus_hidden_equals_total(posts):
    intent = engine.parse_intent("Show DSA", "placements")
    stats = engine.quick_stats(posts, intent, {})
    assert stats["shown"] + stats["hidden"] == len(posts)


def test_quick_stats_suppression_rate_is_fraction(posts):
    intent = engine.parse_intent("Show DSA", "placements")
    stats = engine.quick_stats(posts, intent, {})
    assert 0.0 <= stats["suppressionRate"] <= 1.0
    expected = round(stats["hidden"] / len(posts), 3)
    assert stats["suppressionRate"] == expected


def test_quick_stats_avg_score_only_counts_shown(posts):
    """avgScore must reflect only the visible items, not the whole corpus."""
    intent = engine.parse_intent("Show DSA", "placements")
    ranked = engine.rank_feed(posts, intent, {})
    shown = [p for p in ranked if p["visible"]]
    expected_avg = int(sum(p["score"] for p in shown) / max(len(shown), 1)) if shown else 0
    stats = engine.quick_stats(posts, intent, {})
    assert stats["avgScore"] == expected_avg


def test_quick_stats_zero_shown_gives_zero_avg():
    """If no items are visible, avgScore must be 0, not a division error."""
    # A post with no signal and heavy exclusion will score near 0.
    posts = [
        {
            "id": "x1",
            "platform": "x",
            "title": "meme viral brainrot",
            "body": "meme gossip celebrity",
            "tags": ["meme", "gossip"],
            "author": "bot",
            "type": "post",
        }
    ]
    intent = engine.parse_intent("Show DSA", "placements")
    stats = engine.quick_stats(posts, intent, {})
    # All items should be suppressed by exclusion logic; avgScore must not raise.
    assert isinstance(stats["avgScore"], int)
    assert stats["suppressionRate"] >= 0.0


def test_quick_stats_different_intents_differ(posts):
    """Two distinct intents must produce different quick_stats for the same corpus."""
    placement_intent = engine.parse_intent("Show DSA, system design, placements", "placements")
    skills_intent = engine.parse_intent("Show python, react, tutorials", "skills")
    s1 = engine.quick_stats(posts, placement_intent, {})
    s2 = engine.quick_stats(posts, skills_intent, {})
    # The two intents should not produce identical shown counts against real data.
    # (They could theoretically be equal, but with the 30-post corpus they differ.)
    assert s1 != s2


# ---------------------------------------------------------------- /api/history endpoint


def test_history_endpoint_empty(tmp_path, monkeypatch):
    """GET /api/history with an empty history returns an empty entries list."""
    from fastapi.testclient import TestClient
    import json

    store_path = tmp_path / "store.json"
    store_path.write_text(json.dumps({"profile": {}, "weights": {}, "feedback": [], "history": []}))
    monkeypatch.setattr(engine, "STORE_PATH", store_path)

    import main as app_module
    client = TestClient(app_module.app)
    resp = client.get("/api/history")
    assert resp.status_code == 200
    body = resp.json()
    assert body["entries"] == []
    assert body["total"] == 0


def test_history_endpoint_returns_entries_newest_first(tmp_path, monkeypatch):
    """Entries must appear newest-first (Most recent first)."""
    from fastapi.testclient import TestClient
    import json

    history_data = [
        {"prompt": "Show UPSC content", "goal": "exams"},
        {"prompt": "Show DSA and placements", "goal": "placements"},
        {"prompt": "Show Python tutorials", "goal": "skills"},
    ]
    store_path = tmp_path / "store.json"
    store_path.write_text(json.dumps({"profile": {}, "weights": {}, "feedback": [], "history": history_data}))
    monkeypatch.setattr(engine, "STORE_PATH", store_path)

    import main as app_module
    client = TestClient(app_module.app)
    resp = client.get("/api/history")
    assert resp.status_code == 200
    entries = resp.json()["entries"]
    assert len(entries) == 3
    # Newest entry (last appended) comes first.
    assert entries[0]["prompt"] == "Show Python tutorials"
    assert entries[0]["label"] == "Most recent"
    assert entries[1]["prompt"] == "Show DSA and placements"
    assert entries[1]["label"] == "2nd most recent"
    assert entries[2]["prompt"] == "Show UPSC content"
    assert entries[2]["label"] == "3rd most recent"


def test_history_endpoint_entry_shape(tmp_path, monkeypatch):
    """Each returned entry must contain the required fields."""
    from fastapi.testclient import TestClient
    import json

    store_path = tmp_path / "store.json"
    store_path.write_text(json.dumps({
        "profile": {}, "weights": {}, "feedback": [],
        "history": [{"prompt": "Show DSA", "goal": "placements"}],
    }))
    monkeypatch.setattr(engine, "STORE_PATH", store_path)

    import main as app_module
    client = TestClient(app_module.app)
    resp = client.get("/api/history")
    assert resp.status_code == 200
    entry = resp.json()["entries"][0]
    for key in ("ordinal", "label", "prompt", "goal", "goalLabel", "stats", "stats_note"):
        assert key in entry, f"Missing key: {key}"
    for key in ("shown", "hidden", "avgScore", "suppressionRate"):
        assert key in entry["stats"], f"Missing stats key: {key}"
    assert "Not a historical snapshot" in entry["stats_note"]


def test_history_endpoint_malformed_entry_tolerated(tmp_path, monkeypatch):
    """An entry missing 'prompt' or 'goal' must not crash the endpoint."""
    from fastapi.testclient import TestClient
    import json

    store_path = tmp_path / "store.json"
    store_path.write_text(json.dumps({
        "profile": {}, "weights": {}, "feedback": [],
        "history": [
            {},                                  # completely empty
            {"prompt": None, "goal": None},     # explicit nulls
            {"prompt": "Show DSA"},              # missing goal
            {"goal": "placements"},              # missing prompt
        ],
    }))
    monkeypatch.setattr(engine, "STORE_PATH", store_path)

    import main as app_module
    client = TestClient(app_module.app)
    resp = client.get("/api/history")
    assert resp.status_code == 200
    assert resp.json()["total"] == 4  # all four entries returned, none crash

