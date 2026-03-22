from api.agents.draft_agent import inject_mandatory_disclaimer


def test_injects_disclaimer_when_missing_in_conclusion():
    draft = (
        "##INTRO\n"
        "SIP investing is useful for long-term goals.\n\n"
        "##BODY\n"
        "You can build discipline through monthly investing.\n\n"
        "##CONCLUSION\n"
        "Start with realistic expectations."
    )

    result = inject_mandatory_disclaimer(draft)

    assert "Investments are subject to market risk" in result
    assert "##CONCLUSION\nInvestments are subject to market risk." in result


def test_returns_unchanged_when_disclaimer_already_present():
    draft = (
        "##INTRO\n"
        "SIP investing is useful for long-term goals.\n\n"
        "##BODY\n"
        "You can build discipline through monthly investing.\n\n"
        "##CONCLUSION\n"
        "Investments are subject to market risk. Please read all scheme-related documents "
        "carefully before investing."
    )

    result = inject_mandatory_disclaimer(draft)

    assert result == draft


def test_appends_disclaimer_when_conclusion_marker_missing():
    draft = (
        "##INTRO\n"
        "SIP investing is useful for long-term goals.\n\n"
        "##BODY\n"
        "You can build discipline through monthly investing."
    )

    result = inject_mandatory_disclaimer(draft)

    assert result.endswith(
        "Investments are subject to market risk. "
        "Please read all scheme-related documents carefully before investing."
    )
