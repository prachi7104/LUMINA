from unittest.mock import patch

from api.agents.draft_agent import run_draft_agent


def _state_template() -> dict:
    return {
        "run_id": "draft-phase2-001",
        "brief": {"topic": "SIP strategy", "description": "Long-term investing plan"},
        "strategy": {
            "format": "article",
            "tone": "authoritative",
            "word_count": 500,
            "key_messages": ["discipline"],
            "best_channel": "blog",
        },
        "content_category": "mutual_fund",
        "compliance_feedback": [],
        "compliance_history": [],
        "draft": "",
        "past_feedback": [],
        "draft_version": 0,
        "audit_log": [],
        "trend_context": "",
    }


def test_draft_agent_no_longer_injects_disclaimer():
    state = _state_template()
    llm_output = "##INTRO\nIntro\n##BODY\nBody\n##CONCLUSION\nConclusion"

    with patch("api.agents.draft_agent.call_llm", return_value=llm_output), patch(
        "api.agents.draft_agent.get_recent_corrections", return_value=[]
    ):
        result = run_draft_agent(state)

    assert "Investments are subject to market risk" not in result["draft"]


def test_revision_prompt_includes_compliance_history_memory():
    captured_user_prompts: list[str] = []

    def _capture_call_llm(model, system, user, **kwargs):  # noqa: ARG001
        captured_user_prompts.append(user)
        return "##INTRO\nUpdated\n##BODY\nUpdated\n##CONCLUSION\nUpdated"

    state = _state_template()
    state["draft"] = "##INTRO\nA\n##BODY\nB\n##CONCLUSION\nC"
    state["compliance_feedback"] = [
        {
            "sentence": "Guaranteed returns are certain.",
            "message": "Do not claim guaranteed returns.",
            "suggested_fix": "Use probabilistic language.",
        }
    ]
    state["compliance_history"] = [
        {
            "iteration": 1,
            "verdict": "REVISE",
            "violations_count": 2,
            "summary": "guaranteed returns found",
        },
        {
            "iteration": 2,
            "verdict": "REVISE",
            "violations_count": 1,
            "summary": "still overstated certainty",
        },
    ]

    with patch("api.agents.draft_agent.call_llm", side_effect=_capture_call_llm), patch(
        "api.agents.draft_agent.get_recent_corrections", return_value=[]
    ):
        run_draft_agent(state)

    assert captured_user_prompts
    assert "PREVIOUS COMPLIANCE ATTEMPTS" in captured_user_prompts[0]
