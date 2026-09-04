"""Optional LLM-backed intent parser.

Replaces the deterministic `parse_intent` when configured. Enabled only when
`ORION_LLM_API_KEY` (or `ORION_LLM_BASE_URL`) is set. Falls back to the local
parser on any configuration, network, or schema error so the feed never breaks.

No extra pip dependencies: uses the standard library HTTP client against an
OpenAI-compatible `/chat/completions` endpoint (OpenAI, OpenRouter, Groq,
together.ai, or a local server such as Ollama/vLLM).
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any

from engine import GOAL_PROFILES, parse_intent

_ENABLED = bool(
    os.environ.get("ORION_LLM_API_KEY")
    or os.environ.get("ORION_LLM_BASE_URL")
    or os.environ.get("ORION_LLM_MODEL")
)

BASE_URL = (os.environ.get("ORION_LLM_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
API_KEY = os.environ.get("ORION_LLM_API_KEY") or ""
MODEL = os.environ.get("ORION_LLM_MODEL") or "gpt-4o-mini"
TIMEOUT = float(os.environ.get("ORION_LLM_TIMEOUT") or "20")

_SYSTEM_PROMPT = """You are the intent interpreter for ORION, a goal-based social feed curator.
Given a goal and the user's natural-language prompt, extract:
- interests: short topical phrases the user wants to see (max 10)
- exclusions: short topical phrases the user explicitly wants to suppress (max 10)

Respond ONLY with a JSON object of this exact shape, with no commentary:
{"interests": ["..."], "exclusions": ["..."]}"""


def llm_enabled() -> bool:
    return _ENABLED


def ai_parse_intent(prompt: str, goal: str) -> dict[str, Any]:
    """Parse intent with the configured LLM. Raises any error up to the caller."""
    goal_key = goal if goal in GOAL_PROFILES else "placements"
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Goal: {GOAL_PROFILES[goal_key]['label']}\n"
                    f"Prompt: {prompt or '(none)'}"
                ),
            },
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }
    req = urllib.request.Request(
        f"{BASE_URL}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:  # noqa: S310 (user-configured host)
        body = json.loads(resp.read().decode("utf-8"))
    content = body["choices"][0]["message"]["content"]
    parsed = json.loads(content)

    interests = [str(t).strip() for t in (parsed.get("interests") or [])]
    exclusions = [str(t).strip() for t in (parsed.get("exclusions") or [])]
    interests = dedupe([t for t in interests if t])[:12]
    exclusions = dedupe([t for t in exclusions if t])[:12]

    if not interests:
        raise ValueError("LLM returned no interests")

    parser = parse_intent("", goal_key)  # reuse goal labels & summary formatting
    return {
        "goal": goal_key,
        "goalLabel": GOAL_PROFILES[goal_key]["label"],
        "interests": interests,
        "exclusions": exclusions,
        "summary": (
            f"Optimize for {GOAL_PROFILES[goal_key]['label'].lower()}."
            + (f" Prioritize: {', '.join(interests[:4])}." if interests else "")
            + (f" Suppress: {', '.join(exclusions[:4])}." if exclusions else "")
        ),
        "prompt": prompt,
        "source": "llm",
    }


def parse_intent_smart(prompt: str, goal: str) -> dict[str, Any]:
    """Try the LLM when enabled; always fall back to the deterministic parser."""
    if not _ENABLED:
        return _with_source(parse_intent(prompt, goal), "local")
    try:
        return ai_parse_intent(prompt, goal)
    except Exception as exc:  # noqa: BLE001 - degradation is intentional
        result = _with_source(parse_intent(prompt, goal), "local")
        result["llmError"] = f"{type(exc).__name__}: {exc}"
        return result


def _with_source(parsed: dict[str, Any], source: str) -> dict[str, Any]:
    parsed["source"] = source
    return parsed


def dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = item.lower().strip()
        if key and key not in seen:
            seen.add(key)
            out.append(item)
    return out
