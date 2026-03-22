import pytest

from api.graph.state import ContentState


@pytest.fixture
def minimal_content_state():
	"""Build a minimal ContentState payload for agent tests."""

	def _build(draft: str) -> ContentState:
		return {
			"run_id": "test-run-123",
			"brief": {},
			"engagement_data": None,
			"strategy": {},
			"past_feedback": [],
			"draft": draft,
			"draft_version": 1,
			"compliance_verdict": "",
			"compliance_feedback": [],
			"compliance_iterations": 0,
			"localized_hi": "",
			"blog_html": "",
			"twitter_thread": [],
			"linkedin_post": "",
			"whatsapp_message": "",
			"human_approved": False,
			"escalation_required": False,
			"error_message": None,
			"pipeline_status": "pending",
			"audit_log": [],
		}

	return _build
