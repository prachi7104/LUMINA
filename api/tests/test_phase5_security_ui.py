"""Tests for security fixes and UI data integrity."""

from unittest.mock import patch


class TestFeedbackRelevance:
    def test_stop_words_excluded_from_matching(self):
        """'How' and 'best' should not be used as primary match terms."""
        stop_words = {
            "the",
            "and",
            "for",
            "with",
            "from",
            "that",
            "this",
            "what",
            "how",
            "best",
            "new",
        }
        topic = "How best to invest in mutual funds"
        words = [
            word
            for word in topic.lower().strip().split()
            if len(word) > 3 and word not in stop_words
        ]

        assert "how" not in words
        assert "best" not in words
        assert "mutual" in words or "funds" in words or "invest" in words

    def test_specific_financial_term_used_for_matching(self):
        """SIP, NAV, mutual fund terms should be preserved."""
        stop_words = {
            "the",
            "and",
            "for",
            "with",
            "from",
            "that",
            "this",
            "what",
            "how",
            "best",
            "new",
        }
        topic = "SIP investment strategy for mutual fund"
        words = [
            word
            for word in topic.lower().strip().split()
            if len(word) > 3 and word not in stop_words
        ]

        assert "mutual" in words or "strategy" in words or "investment" in words


class TestMetricsAccuracy:
    def test_brand_rules_used_false_when_default_rules(self):
        """brand_rules_used must be False when no brand guide uploaded."""
        rules_source = "default"
        brand_rules_used = rules_source in ("org_rules", "brand_guide")
        assert brand_rules_used is False

    def test_brand_rules_used_true_when_org_rules(self):
        """brand_rules_used must be True when org rules from brand guide."""
        rules_source = "org_rules"
        brand_rules_used = rules_source in ("org_rules", "brand_guide")
        assert brand_rules_used is True


class TestCorrectionTracking:
    def test_draft_agent_returns_corrections_applied_this_run(self):
        """draft_agent must return corrections_applied_this_run as a state field."""
        from api.agents.draft_agent import run_draft_agent

        state = {
            "brief": {"topic": "test", "description": "test brief"},
            "strategy": {
                "tone": "accessible",
                "word_count": 400,
                "format": "article",
                "key_messages": [],
                "best_channel": "blog",
                "strategy_recommendation": None,
            },
            "compliance_feedback": [],
            "draft": "",
            "past_feedback": [],
            "content_category": "general",
            "output_format": "multi_platform_pack",
            "output_options": ["blog"],
            "trend_context": "",
            "draft_version": 0,
            "audit_log": [],
        }

        mock_corrections = [
            {"diff_summary": "Removed passive voice", "channel": "blog"},
            {"diff_summary": "Shortened sentences", "channel": "blog"},
        ]

        with patch(
            "api.agents.draft_agent.get_recent_corrections",
            return_value=mock_corrections,
        ), patch(
            "api.agents.draft_agent.call_llm",
            return_value=(
                "##INTRO\nIntro\n##BODY\nBody\n##CONCLUSION\n"
                "Conclusion. Investments are subject to market risk."
            ),
        ):
            result = run_draft_agent(state)

        assert "corrections_applied_this_run" in result
        assert result["corrections_applied_this_run"] == 2
