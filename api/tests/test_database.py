import os
import uuid

import pytest

from api.database import (
    approve_run,
    create_run,
    get_audit,
    get_enabled_rules,
    get_outputs,
    get_past_feedback,
    get_supabase_client,
    save_feedback,
    write_audit_log,
    write_pipeline_outputs,
)


pytestmark = pytest.mark.integration


@pytest.fixture(autouse=True)
def cleanup_test_rows():
    """Delete all rows for test run ids after each test."""
    yield

    client = get_supabase_client()
    if client is None:
        return

    # Child tables first, then parent table.
    client.table("agent_events").delete().like("run_id", "test-%").execute()
    client.table("pipeline_outputs").delete().like("run_id", "test-%").execute()
    client.table("content_feedback").delete().like("run_id", "test-%").execute()
    client.table("pipeline_runs").delete().like("id", "test-%").execute()


@pytest.fixture
def test_run_id() -> str:
    return f"test-{uuid.uuid4()}"


@pytest.fixture
def integration_enabled():
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_ANON_KEY"):
        pytest.skip("SUPABASE_URL/SUPABASE_ANON_KEY not configured")


def test_create_and_read_run(integration_enabled, test_run_id):
    brief = {
        "topic": "SIP investment for beginners",
        "description": "Guide for first-time investors",
    }
    create_run(test_run_id, brief)

    client = get_supabase_client()
    assert client is not None

    response = client.table("pipeline_runs").select("*").eq("id", test_run_id).execute()
    rows = response.data or []

    assert len(rows) == 1
    assert rows[0]["brief_topic"] == "SIP investment for beginners"


def test_write_and_read_outputs(integration_enabled, test_run_id):
    create_run(test_run_id, {"topic": "Test output write"})

    outputs = {
        "blog_html": "<article><h1>Test</h1><p>Body</p></article>",
        "twitter_thread": ["1/2 Tweet one", "2/2 Tweet two"],
        "linkedin_post": "A short LinkedIn post for testing.",
        "whatsapp_message": "A short WhatsApp message for testing.",
    }
    localized_hi = "यह एक परीक्षण हिंदी लेख है।"

    write_pipeline_outputs(test_run_id, outputs, localized_hi)

    rows = get_outputs(test_run_id)
    assert len(rows) == 5

    channels = {row["channel"] for row in rows}
    assert channels == {"blog", "twitter", "linkedin", "whatsapp", "article"}

    article_rows = [row for row in rows if row["channel"] == "article"]
    assert len(article_rows) == 1
    assert article_rows[0]["language"] == "hi"


def test_write_and_read_audit_log(integration_enabled, test_run_id):
    create_run(test_run_id, {"topic": "Audit test"})

    audit_log = [
        {
            "agent": "intake_agent",
            "action": "planned",
            "verdict": None,
            "model": "llama-3.1-8b-instant",
            "duration_ms": 100,
            "output_summary": "Intake completed",
        },
        {
            "agent": "draft_agent",
            "action": "generated_draft",
            "verdict": None,
            "model": "llama-3.3-70b-versatile",
            "duration_ms": 250,
            "output_summary": "Draft generated",
        },
        {
            "agent": "compliance_agent",
            "action": "checked_compliance",
            "verdict": "PASS",
            "model": "llama-3.1-8b-instant",
            "duration_ms": 120,
            "output_summary": "No violations",
        },
    ]

    write_audit_log(test_run_id, audit_log)

    rows = get_audit(test_run_id)
    assert len(rows) == 3
    assert [row["agent_name"] for row in rows] == [
        "intake_agent",
        "draft_agent",
        "compliance_agent",
    ]


def test_save_and_retrieve_feedback(integration_enabled, test_run_id):
    create_run(test_run_id, {"topic": "SIP investment"})

    save_feedback(
        run_id=test_run_id,
        rating=4,
        comment="Too formal",
        brief_topic="SIP investment",
        channel="blog",
    )

    feedback = get_past_feedback(topic="SIP")

    assert any("Too formal" in item for item in feedback)


def test_approve_run_updates_status(integration_enabled, test_run_id):
    create_run(test_run_id, {"topic": "Approval test"})

    outputs = {
        "blog_html": "<article><h1>Approve</h1></article>",
        "twitter_thread": ["1/1 Approval test"],
        "linkedin_post": "Approval post",
        "whatsapp_message": "Approval message",
    }
    write_pipeline_outputs(test_run_id, outputs, "हिंदी सामग्री")

    approve_run(test_run_id)

    client = get_supabase_client()
    assert client is not None

    run_rows = client.table("pipeline_runs").select("status").eq("id", test_run_id).execute().data
    assert run_rows and run_rows[0]["status"] == "completed"

    output_rows = (
        client.table("pipeline_outputs")
        .select("approved")
        .eq("run_id", test_run_id)
        .execute()
        .data
    )
    assert output_rows
    assert all(row["approved"] is True for row in output_rows)


def test_get_enabled_rules_returns_8_rules(integration_enabled):
    rules = get_enabled_rules()

    assert len(rules) == 8
    for rule in rules:
        assert "id" in rule
        assert "category" in rule
        assert "rule_text" in rule
        assert "severity" in rule
