"""Complexity-aware model routing inspired by FrugalGPT patterns."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

MODEL_COST_WEIGHTS = {
    "llama-3.1-8b-instant": 1.0,
    "llama-3.3-70b-versatile": 8.0,
    "gemini-2.5-flash": 3.0,
}


def route_model(
    task: str,
    content_category: str = "general",
    draft_length: int = 0,
    compliance_iteration: int = 0,
    has_brand_guide: bool = False,
) -> str:
    """Route model by task complexity and safety criticality."""
    _ = draft_length
    _ = compliance_iteration

    if task == "compliance":
        return "llama-3.3-70b-versatile"

    if task == "localization":
        return "llama-3.3-70b-versatile"

    if task == "draft":
        return "llama-3.3-70b-versatile"

    if task == "intake":
        if has_brand_guide or content_category in {"mutual_fund", "fintech"}:
            return "llama-3.3-70b-versatile"
        return "llama-3.1-8b-instant"

    if task == "format":
        return "llama-3.1-8b-instant"

    if task == "rule_extraction":
        return "llama-3.1-8b-instant"

    return "llama-3.1-8b-instant"


def log_routing_decision(task: str, model: str, reason: str = "") -> None:
    """Emit structured logs for model routing decisions."""
    logger.info(
        "Model routing: task=%s -> model=%s %s",
        task,
        model,
        f"({reason})" if reason else "",
    )
