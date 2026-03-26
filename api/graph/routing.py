"""
Routing logic for LangGraph pipeline nodes.

This module defines conditional routing between pipeline stages based on content state:

- route_after_compliance: Routes based on compliance verdict and iteration count.
  Passes to localization if compliant, escalates if rejected/max iterations,
  or loops back to draft agent for revisions.

- route_after_intake: Logs engagement pivot readiness after intake.
    Currently routes all paths to trend_agent for safe single-path execution.
"""

import logging

from api.graph.state import ContentState

logger = logging.getLogger(__name__)


def route_after_compliance(state: ContentState) -> str:
    """
    Route after compliance check based on verdict and iteration count.

    Returns:
        - "localization_agent" if compliant
        - "human_escalation" if rejected or max iterations reached
        - "draft_agent" if revision needed and iterations < 3
    """
    verdict = state["compliance_verdict"]
    iterations = state["compliance_iterations"]

    # PASS always wins, even when iteration counter reached max.
    if verdict == "PASS":
        return "localization_agent"

    # Hard reject escalates directly.
    if verdict == "REJECT":
        return "human_escalation"

    # REVISE with exhausted attempts escalates.
    if iterations >= 3:
        return "human_escalation"

    # Otherwise: REVISE and iterations < 3
    return "draft_agent"


def route_after_intake(state: ContentState) -> str:
    """
    Route after intake agent processing.

    Route after intake agent.

    Engagement pivots are computed at intake and persisted in state.
    We keep execution on a single path for now (trend_agent), while
    preserving visibility in graph routing and logs for future branching.

    Returns:
        - "trend_agent" for all paths
    """
    engagement_strategy = state.get("engagement_strategy", {}) or {}
    if engagement_strategy.get("pivot_recommended"):
        logger.info(
            "Engagement pivot detected: %s",
            engagement_strategy.get("pivot_reason", ""),
        )

    return "trend_agent"
