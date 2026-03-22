import pytest

from api.agents.trend_agent import run_trend_agent
from api.graph.state import ContentState


def make_state(topic: str, audit_log: list[dict] | None = None) -> ContentState:
    return {
        "brief": {"topic": topic},
        "audit_log": audit_log or [],
    }


def test_returns_empty_string_on_failure(mocker):
    mocker.patch("api.agents.trend_agent.call_llm", side_effect=RuntimeError("LLM failure"))

    result = run_trend_agent(make_state("mutual funds"))

    assert result["trend_context"] == ""


def test_appends_to_audit_log(mocker):
    mocker.patch("api.agents.trend_agent.call_llm", return_value="• Trend 1\n• Trend 2")
    existing_audit = [
        {"agent": "intake_agent", "action": "planned"},
        {"agent": "draft_agent", "action": "drafted"},
    ]

    result = run_trend_agent(make_state("market outlook", audit_log=existing_audit))

    assert len(result["audit_log"]) == 3
    assert result["audit_log"][-1]["agent"] == "trend_agent"


def test_trend_context_stored_in_state(mocker):
    expected = "• RBI rate cut expected\n• SIP inflows at record high"
    mocker.patch("api.agents.trend_agent.call_llm", return_value=expected)

    result = run_trend_agent(make_state("SIP investing"))

    assert result["trend_context"] == expected


@pytest.mark.integration
def test_real_groq_call_returns_non_empty_string():
    result = run_trend_agent(make_state("mutual fund investment for beginners"))

    assert result["trend_context"] != ""
    assert len(result["trend_context"]) > 50
