"""Trend agent: generates current-context bullets to enrich drafting."""

from __future__ import annotations

import logging

from api.graph.state import ContentState
from api.llm import call_llm

logger = logging.getLogger(__name__)


TREND_MODEL = "llama-3.1-8b-instant"
TREND_SYSTEM_PROMPT = (
    "You are a trend analyst for Indian financial and business content.\n"
    "Generate 4-5 bullet points of current context relevant to the given topic.\n"
    "Focus on: recent developments in India, current market sentiment,\n"
    "what Indian readers are currently concerned about regarding this topic,\n"
    "and any recent regulatory or economic changes that affect it.\n"
    "Be specific. Use approximate dates (e.g. 'In early 2026', 'Recently').\n"
    "Do not make up specific statistics. Return only the bullet points, no preamble."
)


def run_trend_agent(state: ContentState) -> dict:
    """Generate lightweight trend context for the current brief topic."""
    topic = state["brief"].get("topic", "")
    trend_context = ""

    try:
        trend_context = call_llm(
            model=TREND_MODEL,
            system=TREND_SYSTEM_PROMPT,
            user=f"Topic: {topic}",
            max_tokens=300,
            json_mode=False,
        )
    except Exception as exc:
        logger.exception("Trend agent failed for topic '%s': %s", topic, exc)
        trend_context = ""

    audit_entry = {
        "agent": "trend_agent",
        "action": "analyzed",
        "model": TREND_MODEL,
        "output_summary": f"Trend context generated: {len(trend_context)} chars",
    }

    return {
        "trend_context": trend_context,
        "audit_log": state.get("audit_log", []) + [audit_entry],
    }
