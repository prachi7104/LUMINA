"""Deterministic disclaimer injector agent."""

from api.graph.state import ContentState

DISCLAIMER_TEXT = (
    "Investments are subject to market risk. "
    "Please read all scheme-related documents carefully before investing."
)


def _inject_into_conclusion(draft: str) -> str:
    """Append disclaimer to the end of the ##CONCLUSION section."""
    marker = "##CONCLUSION"
    draft_text = draft or ""

    if marker not in draft_text:
        trimmed = draft_text.rstrip()
        if trimmed:
            return f"{trimmed}\n\n{marker}\n{DISCLAIMER_TEXT}"
        return f"{marker}\n{DISCLAIMER_TEXT}"

    before, after = draft_text.split(marker, 1)
    after_stripped = after.lstrip("\n")

    if not after_stripped:
        return f"{before}{marker}\n{DISCLAIMER_TEXT}"

    if after_stripped.endswith("\n"):
        return f"{before}{marker}\n{after_stripped}{DISCLAIMER_TEXT}"
    return f"{before}{marker}\n{after_stripped}\n{DISCLAIMER_TEXT}"


def run_disclaimer_injector(state: ContentState) -> dict:
    """
    Ensure mandatory investment disclaimer exists in the draft.

    This agent performs only deterministic string manipulation with no LLM calls.
    """
    draft = state.get("draft", "")
    audit_log = state.get("audit_log", [])

    if "investments are subject to market risk" in draft.lower():
        return {
            "draft": draft,
            "audit_log": audit_log + [{"agent": "disclaimer_injector", "action": "skipped"}],
        }

    updated_draft = _inject_into_conclusion(draft)
    return {
        "draft": updated_draft,
        "audit_log": audit_log + [{"agent": "disclaimer_injector", "action": "injected"}],
    }
