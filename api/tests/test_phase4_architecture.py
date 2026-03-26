"""Tests for Phase 4 architecture: knowledge graph, routing, and engagement branching."""

from __future__ import annotations

import json
from unittest.mock import patch


class TestModelRouter:
    def test_compliance_always_routes_to_70b(self):
        from api.llm_router import route_model

        assert route_model("compliance") == "llama-3.3-70b-versatile"

    def test_intake_routes_to_8b_for_simple_general_content(self):
        from api.llm_router import route_model

        assert (
            route_model("intake", content_category="general", has_brand_guide=False)
            == "llama-3.1-8b-instant"
        )

    def test_intake_routes_to_70b_when_brand_guide_present(self):
        from api.llm_router import route_model

        assert (
            route_model("intake", content_category="general", has_brand_guide=True)
            == "llama-3.3-70b-versatile"
        )

    def test_intake_routes_to_70b_for_mutual_fund(self):
        from api.llm_router import route_model

        assert route_model("intake", content_category="mutual_fund") == "llama-3.3-70b-versatile"

    def test_draft_always_routes_to_70b(self):
        from api.llm_router import route_model

        assert route_model("draft") == "llama-3.3-70b-versatile"


class TestBrandKnowledgeExtraction:
    def test_triples_extracted_from_brand_guide_text(self):
        from api.agents.rule_extractor_agent import _extract_knowledge_triples

        sample_text = """Brand Voice Guidelines:
        Always use authoritative but accessible language.
        Never claim guaranteed returns.
        All investment content must include the SEBI disclaimer.
        Brand name: ET Wealth."""

        mock_triples = [
            {"entity": "brand_voice", "relation": "describes", "value": "authoritative but accessible"},
            {
                "entity": "guaranteed_returns",
                "relation": "prohibits",
                "value": "never claim guaranteed returns",
            },
            {
                "entity": "disclaimer",
                "relation": "requires",
                "value": "SEBI disclaimer in all investment content",
            },
            {"entity": "brand_name", "relation": "is_a", "value": "ET Wealth"},
        ]

        with patch(
            "api.agents.rule_extractor_agent.call_llm",
            return_value=json.dumps(mock_triples),
        ):
            result = _extract_knowledge_triples(sample_text, "test-session", "llama-3.1-8b-instant")

        assert len(result) == 4
        entities = [item["entity"] for item in result]
        assert "brand_voice" in entities
        assert "guaranteed_returns" in entities


class TestEngagementBranching:
    def test_pivot_detected_for_4x_differential(self):
        """Video 4x better than text should trigger pivot recommendation."""
        from api.agents.intake_agent import run_intake_agent

        engagement_data = {
            "video": {"avg_views": 4200, "engagement_rate": 0.082},
            "text_article": {"avg_views": 980, "engagement_rate": 0.019},
        }

        mock_strategy = {
            "format": "multi_platform_pack",
            "tone": "accessible",
            "word_count": 600,
            "key_messages": [],
            "channels": ["linkedin"],
            "languages": ["en"],
            "compliance_flags": [],
            "best_channel": "linkedin",
            "strategy_recommendation": "Pivot to video-first strategy",
            "content_calendar": [
                {"week": 1, "items": [{"format": "video", "topic": "test", "channel": "linkedin"}]}
            ],
        }

        state = {
            "brief": {"topic": "investments", "description": "test"},
            "engagement_data": engagement_data,
            "output_format": "multi_platform_pack",
            "output_options": ["blog", "linkedin", "twitter", "whatsapp"],
            "audit_log": [],
            "session_id": "default",
        }

        with patch("api.agents.intake_agent.call_llm", return_value=json.dumps(mock_strategy)):
            result = run_intake_agent(state)

        assert result["engagement_strategy"]["pivot_recommended"] is True
        assert result["engagement_strategy"]["performance_ratio"] > 2.0
        assert result.get("output_options", [])[0] == "linkedin"

    def test_no_pivot_when_channels_comparable(self):
        """Similar engagement across channels should not trigger pivot."""
        from api.agents.intake_agent import run_intake_agent

        engagement_data = {
            "video": {"avg_views": 1200, "engagement_rate": 0.022},
            "text_article": {"avg_views": 1000, "engagement_rate": 0.019},
        }

        mock_strategy = {
            "format": "multi_platform_pack",
            "tone": "accessible",
            "word_count": 600,
            "key_messages": [],
            "channels": ["blog"],
            "languages": ["en"],
            "compliance_flags": [],
            "best_channel": "blog",
            "strategy_recommendation": None,
            "content_calendar": None,
        }

        state = {
            "brief": {"topic": "test", "description": "test"},
            "engagement_data": engagement_data,
            "output_format": "multi_platform_pack",
            "output_options": ["blog", "linkedin", "twitter", "whatsapp"],
            "audit_log": [],
            "session_id": "default",
        }

        with patch("api.agents.intake_agent.call_llm", return_value=json.dumps(mock_strategy)):
            result = run_intake_agent(state)

        assert result["engagement_strategy"].get("pivot_recommended", False) is False


class TestRouteAfterIntake:
    def test_route_after_intake_returns_trend_agent(self):
        from api.graph.routing import route_after_intake

        state = {
            "engagement_data": {"video": {"engagement_rate": 0.1}},
            "engagement_strategy": {
                "pivot_recommended": True,
                "pivot_reason": "video beats blog",
            },
        }

        assert route_after_intake(state) == "trend_agent"
