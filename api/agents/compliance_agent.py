"""
Compliance agent: Checks draft against compliance rules.
"""

import json
import time
from pathlib import Path

from api.graph.state import ContentState
from api.llm import call_llm


def run_compliance_agent(state: ContentState) -> dict:
    """
    Check draft against compliance rules and provide verdict.

    Returns:
        dict: State updates with verdict, feedback, incremented iterations
    """
    draft = state.get("draft", "")
    current_iterations = state.get("compliance_iterations", 0)

    # Load rules from JSON at call time (not module import time)
    rules_path = Path(__file__).parent.parent / "data" / "compliance_rules.json"
    with open(rules_path) as f:
        all_rules = json.load(f)

    # Filter enabled rules and format them
    enabled_rules = [r for r in all_rules if r.get("enabled", False)]
    formatted_rules = "\n".join(
        [f"{r['id']}: [{r['category']}] {r['rule_text']}" for r in enabled_rules]
    )

    # System prompt with exact JSON schema
    system_prompt = """You are a compliance checker for Economic Times financial content.
Review the draft article against the compliance rules below.

VERDICT rules:
- PASS: No rule violations found
- REVISE: Rule violations exist, but can be corrected with targeted rewrites
- REJECT: Factually false claims that cannot be fixed by rewording

Annotation requirements:
- Return each violation as an annotation with:
  - section: INTRO, BODY, or CONCLUSION
  - sentence: The exact sentence from the draft (verbatim)
  - rule_id: The rule violated (e.g., R01)
  - severity: error or warning
  - message: Violation description
  - suggested_fix: How to fix it

Return ONLY a JSON object with this schema:
{
  "verdict": "PASS | REVISE | REJECT",
  "annotations": [
    {
      "section": "INTRO | BODY | CONCLUSION",
      "sentence": "exact verbatim sentence from draft",
      "rule_id": "R01",
      "severity": "error | warning",
      "message": "violation description",
      "suggested_fix": "how to fix"
    }
  ],
  "summary": "brief summary of findings"
}

Critical rules:
1. If verdict is PASS, annotations must be an empty array []
2. REJECT only for factually false claims that cannot be fixed by rewording
3. REVISE when violations exist but can be corrected with targeted rewrites
4. Annotate EVERY violation you find
5. Return ONLY the JSON object. No explanation, no markdown."""

    # Build user prompt
    user_prompt = f"""RULES:
{formatted_rules}

DRAFT:
{draft}"""

    # Call LLM with timing
    start_time = time.time()
    model = "llama-3.1-8b-instant"

    raw_response = call_llm(
        model=model,
        system=system_prompt,
        user=user_prompt,
        max_tokens=2000,
        json_mode=True
    )

    end_time = time.time()
    duration_ms = int((end_time - start_time) * 1000)

    # Strip markdown code fences
    cleaned_response = raw_response.strip()
    if cleaned_response.startswith("```json"):
        cleaned_response = cleaned_response[7:]
    if cleaned_response.startswith("```"):
        cleaned_response = cleaned_response[3:]
    if cleaned_response.endswith("```"):
        cleaned_response = cleaned_response[:-3]
    cleaned_response = cleaned_response.strip()

    # Parse JSON
    result = json.loads(cleaned_response)

    # Extract components
    verdict = result.get("verdict", "PASS")
    annotations = result.get("annotations", [])
    summary = result.get("summary", "")

    # Build audit log entry
    audit_entry = {
        "agent": "compliance_agent",
        "action": "checked_compliance",
        "model": model,
        "duration_ms": duration_ms,
        "verdict": verdict,
        "violations": len(annotations),
        "output_summary": summary[:100] if summary else "No violations found"
    }

    return {
        "compliance_verdict": verdict,
        "compliance_feedback": annotations,
        "compliance_iterations": current_iterations + 1,
        "pipeline_status": "compliance_complete",
        "audit_log": state.get("audit_log", []) + [audit_entry]
    }
