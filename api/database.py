"""Database helpers for NarrativeOps Supabase persistence."""

from __future__ import annotations

import json
import logging
import os

from supabase import Client, create_client

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_supabase_client() -> Client | None:
    """Create Supabase client lazily and reuse it across calls."""
    global _client
    if _client is not None:
        return _client

    try:
        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "").strip()

        if not supabase_url or not supabase_anon_key:
            logger.error("SUPABASE_URL or SUPABASE_ANON_KEY is missing")
            return None

        _client = create_client(supabase_url, supabase_anon_key)
        return _client
    except Exception as exc:
        logger.exception("Failed to initialize Supabase client: %s", exc)
        return None


def create_run(run_id: str, brief: dict) -> None:
    """Insert a new run row into pipeline_runs."""
    client = get_supabase_client()
    if client is None:
        return None

    try:
        payload = {
            "id": run_id,
            "brief_topic": brief.get("topic", "Untitled"),
            "brief_json": brief,
        }
        client.table("pipeline_runs").insert(payload).execute()
    except Exception as exc:
        logger.exception("Failed to create run %s: %s", run_id, exc)
    return None


def update_run_status(run_id: str, status: str) -> None:
    """Update status in pipeline_runs for the given run_id."""
    client = get_supabase_client()
    if client is None:
        return None

    try:
        client.table("pipeline_runs").update({"status": status}).eq("id", run_id).execute()
    except Exception as exc:
        logger.exception("Failed to update run status for %s: %s", run_id, exc)
    return None


def write_pipeline_outputs(run_id: str, outputs: dict, localized_hi: str) -> None:
    """Insert channel outputs for EN channels and Hindi article into pipeline_outputs."""
    client = get_supabase_client()
    if client is None:
        return None

    try:
        rows = [
            {
                "run_id": run_id,
                "channel": "blog",
                "language": "en",
                "content": outputs.get("blog_html", ""),
            },
            {
                "run_id": run_id,
                "channel": "twitter",
                "language": "en",
                "content": json.dumps(outputs.get("twitter_thread", [])),
            },
            {
                "run_id": run_id,
                "channel": "linkedin",
                "language": "en",
                "content": outputs.get("linkedin_post", ""),
            },
            {
                "run_id": run_id,
                "channel": "whatsapp",
                "language": "en",
                "content": outputs.get("whatsapp_message", ""),
            },
            {
                "run_id": run_id,
                "channel": "article",
                "language": "hi",
                "content": localized_hi,
            },
        ]
        client.table("pipeline_outputs").insert(rows).execute()
    except Exception as exc:
        logger.exception("Failed to write pipeline outputs for %s: %s", run_id, exc)
    return None


def write_audit_log(run_id: str, audit_log: list[dict]) -> None:
    """Insert one row per audit entry into agent_events."""
    client = get_supabase_client()
    if client is None:
        return None

    try:
        rows = []
        for entry in audit_log:
            rows.append(
                {
                    "run_id": run_id,
                    "agent_name": entry.get("agent"),
                    "action": entry.get("action"),
                    "verdict": entry.get("verdict"),
                    "model_used": entry.get("model"),
                    "duration_ms": entry.get("duration_ms"),
                    "output_summary": entry.get("output_summary"),
                }
            )

        if rows:
            client.table("agent_events").insert(rows).execute()
    except Exception as exc:
        logger.exception("Failed to write audit log for %s: %s", run_id, exc)
    return None


def get_outputs(run_id: str) -> list[dict]:
    """Get all channel outputs for a run."""
    client = get_supabase_client()
    if client is None:
        return []

    try:
        response = client.table("pipeline_outputs").select("*").eq("run_id", run_id).execute()
        return list(response.data or [])
    except Exception as exc:
        logger.exception("Failed to get outputs for %s: %s", run_id, exc)
        return []


def patch_output(run_id: str, channel: str, language: str, content: str) -> None:
    """Update one pipeline output content by run/channel/language."""
    client = get_supabase_client()
    if client is None:
        return None

    try:
        (
            client.table("pipeline_outputs")
            .update({"content": content})
            .eq("run_id", run_id)
            .eq("channel", channel)
            .eq("language", language)
            .execute()
        )
    except Exception as exc:
        logger.exception(
            "Failed to patch output for run_id=%s channel=%s language=%s: %s",
            run_id,
            channel,
            language,
            exc,
        )
    return None


def get_audit(run_id: str) -> list[dict]:
    """Get audit events for a run ordered by creation time."""
    client = get_supabase_client()
    if client is None:
        return []

    try:
        response = (
            client.table("agent_events")
            .select("*")
            .eq("run_id", run_id)
            .order("created_at", desc=False)
            .execute()
        )
        return list(response.data or [])
    except Exception as exc:
        logger.exception("Failed to get audit for %s: %s", run_id, exc)
        return []


def approve_run(run_id: str) -> None:
    """Mark run completed and mark all related outputs approved."""
    client = get_supabase_client()
    if client is None:
        return None

    try:
        client.table("pipeline_runs").update({"status": "completed"}).eq("id", run_id).execute()
    except Exception as exc:
        logger.exception("Failed to mark run completed for %s: %s", run_id, exc)

    try:
        client.table("pipeline_outputs").update({"approved": True}).eq("run_id", run_id).execute()
    except Exception as exc:
        logger.exception("Failed to approve outputs for %s: %s", run_id, exc)
    return None


def save_feedback(
    run_id: str,
    rating: int,
    comment: str,
    brief_topic: str,
    channel: str,
) -> None:
    """Insert feedback row into content_feedback."""
    client = get_supabase_client()
    if client is None:
        return None

    try:
        payload = {
            "run_id": run_id,
            "rating": rating,
            "comment": comment,
            "brief_topic": brief_topic,
            "channel": channel,
        }
        client.table("content_feedback").insert(payload).execute()
    except Exception as exc:
        logger.exception("Failed to save feedback for %s: %s", run_id, exc)
    return None


def get_past_feedback(topic: str, limit: int = 3) -> list[str]:
    """Get recent feedback matching the first word of topic."""
    client = get_supabase_client()
    if client is None:
        return []

    try:
        first_word = (topic or "").strip().split()[0] if (topic or "").strip() else ""
        if not first_word:
            return []

        response = (
            client.table("content_feedback")
            .select("rating,comment")
            .ilike("brief_topic", f"%{first_word}%")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = response.data or []

        formatted_feedback = []
        for row in rows:
            rating = row.get("rating", "?")
            comment = row.get("comment") or ""
            formatted_feedback.append(f"Rating {rating}/5: {comment}")
        return formatted_feedback
    except Exception as exc:
        logger.exception("Failed to fetch past feedback for topic '%s': %s", topic, exc)
        return []


def get_enabled_rules() -> list[dict]:
    """Return all enabled compliance rules."""
    client = get_supabase_client()
    if client is None:
        return []

    try:
        response = client.table("compliance_rules").select("*").eq("enabled", True).execute()
        return list(response.data or [])
    except Exception as exc:
        logger.exception("Failed to fetch enabled compliance rules: %s", exc)
        return []
